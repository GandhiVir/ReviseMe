// Ported from worker/src/index.ts in the mobile app's Cloudflare Worker —
// same prompts, schemas, and model choices, called directly from Next.js API
// routes instead of through a separate proxy (these routes run server-side,
// so there's no need for a proxy layer the way the mobile app needed one to
// keep the key out of the shipped app binary).
import type { QuizQuestion } from "./types";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

async function callGeminiWithRetry(body: unknown, url: string = GEMINI_URL, maxAttempts = 3): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${url}?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status !== 429) return response;
    lastResponse = response;
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  return lastResponse!;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await callGeminiWithRetry(
    { requests: texts.map((text) => ({ model: `models/${EMBEDDING_MODEL}`, content: { parts: [{ text }] } })) },
    EMBEDDING_URL
  );

  if (!response.ok) {
    throw new Error(`Gemini embedding request failed: ${await response.text()}`);
  }

  const json: any = await response.json();
  return json.embeddings.map((e: { values: number[] }) => e.values);
}

const VOCAB_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    vocabulary: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          pronunciation: { type: "STRING" },
          translation: { type: "STRING" },
        },
        required: ["original", "pronunciation", "translation"],
      },
    },
  },
  required: ["vocabulary"],
};

export const VOCAB_EXTRACTION_PROMPT = `You are helping a language learner build a vocabulary list from their notes.
Look at this file and identify ONLY the vocabulary words or short phrases being studied — skip dates,
page numbers, headers, and any surrounding sentences that aren't themselves vocabulary items.

For each vocabulary term, provide:
- "original": the term exactly as written (if handwritten, do your best to read the handwriting)
- "pronunciation": a romanized pronunciation guide (e.g. Pinyin for Chinese, Romaji for Japanese,
  Revised Romanization for Korean; for already-Latin-script languages, a phonetic respelling)
- "translation": the English meaning

Return an empty list if the file contains no vocabulary terms to extract.`;

export type VocabEntry = { original: string; pronunciation: string; translation: string };

export function formatVocab(vocabulary: VocabEntry[]): string {
  return vocabulary.map((v) => `${v.original} : ${v.pronunciation} : ${v.translation}`).join("\n");
}

export async function extractVocabularyViaGemini(base64Data: string, mimeType: string): Promise<string> {
  const response = await callGeminiWithRetry({
    contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: VOCAB_EXTRACTION_PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: VOCAB_RESPONSE_SCHEMA },
  });

  if (!response.ok) {
    throw new Error(`Gemini text extraction failed: ${await response.text()}`);
  }

  const json: any = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = rawText ? (JSON.parse(rawText) as { vocabulary: VocabEntry[] }) : { vocabulary: [] };
  return formatVocab(parsed.vocabulary);
}

interface NoteInput {
  id: string;
  text: string;
  topic: string;
}

const QUIZ_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          answer: { type: "STRING" },
          sourceNoteId: { type: "STRING" },
        },
        required: ["question", "answer", "sourceNoteId"],
      },
    },
  },
  required: ["questions"],
};

// A vocab-extracted note's lines look like "original : pronunciation : translation" —
// count those to size the quiz around how many *facts* are actually present, not how
// many note chunks there are.
const VOCAB_LINE_PATTERN = /.+:.+:.+/;

function countQuizWorthyFacts(notes: NoteInput[]): number {
  let vocabLines = 0;
  for (const note of notes) {
    for (const line of note.text.split("\n")) {
      if (VOCAB_LINE_PATTERN.test(line.trim())) vocabLines++;
    }
  }
  return vocabLines > 0 ? vocabLines : notes.length * 2;
}

function buildQuizPrompt(notes: NoteInput[]): string {
  const notesBlock = notes.map((n) => `[note id: ${n.id}] (topic: ${n.topic})\n${n.text}`).join("\n\n");
  const questionCount = Math.min(countQuizWorthyFacts(notes), 15);
  return `You are a study-quiz generator. Using ONLY the student's own notes below, write ${questionCount}
quiz questions that test recall and understanding of this material.

Each question must test exactly ONE fact or vocabulary term — never bundle multiple words or
facts into a single question or answer, even if that means writing more, shorter questions.
If the notes are a vocabulary list ("original : pronunciation : translation" lines), write one
question per vocabulary term (e.g. asking for its pronunciation, its translation, or to use it
in context) rather than grouping several terms into one question.

For each question, include the "id" of the single note it's most based on, as "sourceNoteId".
Do not invent facts that aren't supported by the notes. Mix recall questions with at least one
application/"explain why" style question if the material allows for it.

Notes:
${notesBlock}`;
}

export async function generateQuiz(notes: NoteInput[]): Promise<QuizQuestion[]> {
  if (notes.length === 0) return [];

  const response = await callGeminiWithRetry({
    contents: [{ parts: [{ text: buildQuizPrompt(notes) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: QUIZ_RESPONSE_SCHEMA },
  });

  if (!response.ok) {
    throw new Error(`Gemini quiz generation failed: ${await response.text()}`);
  }

  const json: any = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Gemini returned no content");

  const parsed = JSON.parse(rawText) as { questions: { question: string; answer: string; sourceNoteId: string }[] };
  return parsed.questions.map((q) => ({ question: q.question, answer: q.answer, sourceChunkIds: [q.sourceNoteId] }));
}
