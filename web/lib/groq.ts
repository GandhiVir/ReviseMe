// Backup used when Gemini fails, for both OCR (vision, images only — Groq's
// chat-completions API takes an image_url, not a PDF) and quiz generation
// (plain text). Model id verified working directly against Groq's API
// during the mobile app's Worker implementation — llama-4-scout (the
// originally chosen model) had been deprecated by the time this was tested;
// qwen/qwen3.8-27b was the only vision-capable model in Groq's free-tier
// lineup at that time, and it handles text-only prompts fine too. Re-check
// https://api.groq.com/openai/v1/models if this starts failing — Groq's
// model lineup shifts.
import { VOCAB_EXTRACTION_PROMPT, buildQuizPrompt, formatVocab, type NoteInput, type VocabEntry } from "./gemini";
import type { QuizQuestion } from "./types";

const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Returns null on any failure (including a missing GROQ_API_KEY), so the caller can fall through to its next option. */
export async function extractVocabularyViaGroq(base64Data: string, mimeType: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
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
              {
                type: "text",
                text: `${VOCAB_EXTRACTION_PROMPT}\n\nRespond with JSON only, shaped exactly like: {"vocabulary": [{"original": "...", "pronunciation": "...", "translation": "..."}]}`,
              },
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

/** Returns null on any failure (including a missing GROQ_API_KEY), so the caller can fall through to its next option. */
export async function generateQuizViaGroq(notes: NoteInput[]): Promise<QuizQuestion[] | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || notes.length === 0) return null;

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: `${buildQuizPrompt(notes)}\n\nRespond with JSON only, shaped exactly like: {"questions": [{"question": "...", "answer": "...", "sourceNoteId": "..."}]}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const json: any = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { questions: { question: string; answer: string; sourceNoteId: string }[] };
    return parsed.questions.map((q) => ({ question: q.question, answer: q.answer, sourceChunkIds: [q.sourceNoteId] }));
  } catch {
    return null;
  }
}
