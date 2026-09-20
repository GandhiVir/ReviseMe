import type { Chunk } from "./types";

const CHUNK_TARGET_WORDS = 60;

export function chunkText(rawText: string): string[] {
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    for (let i = 0; i < words.length; i += CHUNK_TARGET_WORDS) {
      chunks.push(words.slice(i, i + CHUNK_TARGET_WORDS).join(" "));
    }
  }
  return chunks.length > 0 ? chunks : [rawText.trim()];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both vectors are pre-normalized by Gemini, so dot product == cosine similarity
}

export function rankChunksByQuery(chunks: Chunk[], queryVector: number[], topK: number): Chunk[] {
  return [...chunks]
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}
