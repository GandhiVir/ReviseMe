import { addChunks, addWeeklyNote } from "../db/database";
import { chunkText, embedBatch } from "../embeddings/embed";
import type { Chunk, SourceType, WeeklyNote } from "../types";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ingests one week's raw note text: stores the note, splits it into chunks,
 * embeds each chunk, and stores those too. Topic tagging here is manual
 * (the topic the user picked for the whole note) — a nice upgrade later is
 * an LLM call that tags each chunk individually, but that's an extra paid
 * call per note, so it's left manual for the free-tier-only MVP.
 */
export async function ingestWeeklyNote(params: {
  subjectId: string;
  weekNumber: number;
  rawText: string;
  topic: string;
  sourceType: SourceType;
}): Promise<WeeklyNote> {
  const note = await addWeeklyNote({
    subjectId: params.subjectId,
    weekNumber: params.weekNumber,
    date: new Date().toISOString(),
    rawText: params.rawText,
    sourceType: params.sourceType,
  });

  const texts = chunkText(params.rawText);
  const embeddings = await embedBatch(texts);
  const chunks: Chunk[] = texts.map((text, i) => ({
    id: newId(),
    noteId: note.id,
    subjectId: params.subjectId,
    text,
    embedding: embeddings[i],
    topic: params.topic,
    weekNumber: params.weekNumber,
  }));

  await addChunks(chunks);
  return note;
}
