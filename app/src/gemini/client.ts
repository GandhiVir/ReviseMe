import type { Chunk, QuizQuestion } from "../types";

const PROXY_URL = process.env.EXPO_PUBLIC_QUIZ_PROXY_URL;

/** Thrown when the Worker/Gemini request fails, with the HTTP status attached so callers can tell a rate limit (429) apart from other failures. */
export class ProxyRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProxyRequestError";
  }
}

interface GenerateQuizResponse {
  questions: QuizQuestion[];
}

/**
 * Calls our own Cloudflare Worker (see /worker), never the Gemini API
 * directly — the Worker holds the API key so it never ships inside the app
 * binary. The Worker is a stateless pass-through: nothing here is persisted
 * server-side, only the on-device SQLite database.
 */
export async function generateQuiz(chunks: Chunk[]): Promise<QuizQuestion[]> {
  if (!PROXY_URL) {
    throw new Error(
      "EXPO_PUBLIC_QUIZ_PROXY_URL is not set. Copy .env.example to .env and set it to your deployed Worker URL."
    );
  }
  if (chunks.length === 0) {
    return [];
  }

  const response = await fetch(`${PROXY_URL}/generate-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notes: chunks.map((c) => ({ id: c.id, text: c.text, topic: c.topic })),
    }),
  });

  if (!response.ok) {
    throw new ProxyRequestError(`Quiz generation failed: ${await response.text()}`, response.status);
  }

  const data = (await response.json()) as GenerateQuizResponse;
  return data.questions;
}

interface EmbedResponse {
  embeddings: number[][];
}

/**
 * Same Worker proxy as generateQuiz, different endpoint. Embeddings run on
 * Gemini's free tier rather than on-device — see the on-device ONNX Runtime
 * write-up in the repo history for why that path was abandoned (a native
 * module registration issue under this RN version's architecture).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!PROXY_URL) {
    throw new Error(
      "EXPO_PUBLIC_QUIZ_PROXY_URL is not set. Copy .env.example to .env and set it to your deployed Worker URL."
    );
  }
  if (texts.length === 0) {
    return [];
  }

  const response = await fetch(`${PROXY_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    throw new ProxyRequestError(`Embedding failed: ${await response.text()}`, response.status);
  }

  const data = (await response.json()) as EmbedResponse;
  return data.embeddings;
}

interface ExtractTextResponse {
  text: string;
}

/**
 * Sends an image or PDF (base64-encoded) to Gemini's vision/document
 * understanding, which handles handwriting and non-Latin scripts far better
 * than on-device OCR. Callers should catch ProxyRequestError with
 * status === 429 and fall back to on-device ML Kit OCR when it's an image.
 */
export async function extractTextFromFile(base64Data: string, mimeType: string): Promise<string> {
  if (!PROXY_URL) {
    throw new Error(
      "EXPO_PUBLIC_QUIZ_PROXY_URL is not set. Copy .env.example to .env and set it to your deployed Worker URL."
    );
  }

  const response = await fetch(`${PROXY_URL}/extract-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: base64Data, mimeType }),
  });

  if (!response.ok) {
    throw new ProxyRequestError(`Text extraction failed: ${await response.text()}`, response.status);
  }

  const data = (await response.json()) as ExtractTextResponse;
  return data.text;
}
