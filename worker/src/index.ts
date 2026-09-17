export interface Env {
  GEMINI_API_KEY: string;
  GROQ_API_KEY?: string;
}

interface NoteInput {
  id: string;
  text: string;
  topic: string;
}

interface GenerateQuizRequest {
  notes: NoteInput[];
}

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

// Backup for OCR only, when Gemini is down/overloaded/rate-limited — free-tier
// vision-capable model on Groq. Images only (no PDF support), tried before
// falling all the way back to on-device ML Kit, which can't read handwriting
// or non-Latin scripts at all. Optional: GROQ_API_KEY may not be configured,
// in which case this backup is simply skipped.
const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface EmbedRequest {
  texts: string[];
}

interface ExtractTextRequest {
  data: string; // base64-encoded file bytes
  mimeType: string; // e.g. "image/jpeg" or "application/pdf"
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

const VOCAB_EXTRACTION_PROMPT = `You are helping a language learner build a vocabulary list from their notes.
Look at this file and identify ONLY the vocabulary words or short phrases being studied — skip dates,
page numbers, headers, and any surrounding sentences that aren't themselves vocabulary items.

For each vocabulary term, provide:
- "original": the term exactly as written (if handwritten, do your best to read the handwriting)
- "pronunciation": a romanized pronunciation guide (e.g. Pinyin for Chinese, Romaji for Japanese,
  Revised Romanization for Korean; for already-Latin-script languages, a phonetic respelling)
- "translation": the English meaning

Return an empty list if the file contains no vocabulary terms to extract.`;

const RESPONSE_SCHEMA = {
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
// many note chunks there are. Otherwise a chunk holding 10 vocab words but counted as
// "1 note" only gets ~2 questions, forcing the model to cram several words into one.
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

function buildPrompt(notes: NoteInput[]): string {
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

async function callGeminiWithRetry(
  apiKey: string,
  body: unknown,
  url: string = GEMINI_URL,
  maxAttempts = 3
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${url}?key=${apiKey}`, {
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

type VocabEntry = { original: string; pronunciation: string; translation: string };

function formatVocab(vocabulary: VocabEntry[]): string {
  return vocabulary.map((v) => `${v.original} : ${v.pronunciation} : ${v.translation}`).join("\n");
}

/**
 * Backup vocabulary extraction via Groq's free-tier vision model, used only
 * when Gemini fails and only for images (Groq's chat-completions API takes
 * an image_url, not a PDF). Returns null on any failure — including a
 * missing GROQ_API_KEY — so the caller can fall through to its next option
 * without needing to inspect the error.
 */
async function extractVocabularyViaGroq(apiKey: string | undefined, base64Data: string, mimeType: string): Promise<string | null> {
  if (!apiKey || !mimeType.startsWith("image/")) return null;

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${VOCAB_EXTRACTION_PROMPT}\n\nRespond with JSON only, shaped exactly like: {"vocabulary": [{"original": "...", "pronunciation": "...", "translation": "..."}]}` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const json: any = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { vocabulary: VocabEntry[] };
    return formatVocab(parsed.vocabulary ?? []);
  } catch {
    return null;
  }
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleEmbed(request: Request, env: Env): Promise<Response> {
  let payload: EmbedRequest;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
  }

  if (!payload.texts || payload.texts.length === 0) {
    return new Response(JSON.stringify({ embeddings: [] }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  const geminiBody = {
    requests: payload.texts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody, EMBEDDING_URL);

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return new Response(`Gemini embedding request failed: ${errText}`, {
      status: geminiResponse.status,
      headers: corsHeaders(),
    });
  }

  const geminiJson: any = await geminiResponse.json();
  const embeddings: number[][] = geminiJson.embeddings.map((e: { values: number[] }) => e.values);

  return new Response(JSON.stringify({ embeddings }), {
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function handleExtractText(request: Request, env: Env): Promise<Response> {
  let payload: ExtractTextRequest;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
  }

  if (!payload.data || !payload.mimeType) {
    return new Response("Missing data or mimeType", { status: 400, headers: corsHeaders() });
  }

  const geminiBody = {
    contents: [
      {
        parts: [{ inlineData: { mimeType: payload.mimeType, data: payload.data } }, { text: VOCAB_EXTRACTION_PROMPT }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VOCAB_RESPONSE_SCHEMA,
    },
  };

  const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody);

  if (!geminiResponse.ok) {
    const geminiErrText = await geminiResponse.text();

    const groqText = await extractVocabularyViaGroq(env.GROQ_API_KEY, payload.data, payload.mimeType);
    if (groqText !== null) {
      return new Response(JSON.stringify({ text: groqText }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    return new Response(`Gemini text extraction failed: ${geminiErrText}`, {
      status: geminiResponse.status,
      headers: corsHeaders(),
    });
  }

  const geminiJson: any = await geminiResponse.json();
  const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = rawText ? (JSON.parse(rawText) as { vocabulary: VocabEntry[] }) : { vocabulary: [] };

  return new Response(JSON.stringify({ text: formatVocab(parsed.vocabulary) }), {
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/embed" && request.method === "POST") {
      return handleEmbed(request, env);
    }

    if (url.pathname === "/extract-text" && request.method === "POST") {
      return handleExtractText(request, env);
    }

    if (url.pathname !== "/generate-quiz" || request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: corsHeaders() });
    }

    let payload: GenerateQuizRequest;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
    }

    if (!payload.notes || payload.notes.length === 0) {
      return new Response(JSON.stringify({ questions: [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const geminiBody = {
      contents: [{ parts: [{ text: buildPrompt(payload.notes) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(`Gemini request failed: ${errText}`, {
        status: geminiResponse.status,
        headers: corsHeaders(),
      });
    }

    const geminiJson: any = await geminiResponse.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response("Gemini returned no content", { status: 502, headers: corsHeaders() });
    }

    const parsed = JSON.parse(rawText) as {
      questions: { question: string; answer: string; sourceNoteId: string }[];
    };

    const questions = parsed.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      sourceChunkIds: [q.sourceNoteId],
    }));

    return new Response(JSON.stringify({ questions }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  },
};
