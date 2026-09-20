import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { chunks as chunksTable, topicMastery as topicMasteryTable } from "./db/schema";
import { embedTexts } from "./gemini";
import { rankChunksByQuery } from "./embeddings";
import { isDue, isWeakSpot } from "./spacedRepetition";
import type { Chunk, QuizMode } from "./types";

const DEFAULT_TOP_K = 8;

export async function retrieveChunksForQuiz(subjectId: string, mode: QuizMode): Promise<Chunk[]> {
  const allChunkRows = await db.select().from(chunksTable).where(eq(chunksTable.subjectId, subjectId));
  const allChunks: Chunk[] = allChunkRows.map((c) => ({
    id: c.id,
    noteId: c.noteId,
    subjectId: c.subjectId,
    text: c.text,
    embedding: c.embedding,
    topic: c.topic,
    weekNumber: c.weekNumber,
  }));

  switch (mode.kind) {
    case "due":
    case "weakSpots": {
      const masteryRows = await db.select().from(topicMasteryTable).where(eq(topicMasteryTable.subjectId, subjectId));
      const filterFn =
        mode.kind === "due"
          ? (m: (typeof masteryRows)[number]) => isDue({ nextDueDate: m.nextDueDate })
          : (m: (typeof masteryRows)[number]) => isWeakSpot({ correctStreak: m.correctStreak });
      const matchingTopics = new Set(masteryRows.filter(filterFn).map((m) => m.topic));
      const matching = allChunks.filter((c) => matchingTopics.has(c.topic));
      return matching.length > 0 ? matching.slice(0, DEFAULT_TOP_K) : allChunks.slice(0, DEFAULT_TOP_K);
    }
    case "week":
      return allChunks.filter((c) => c.weekNumber === mode.weekNumber);
    case "topicQuery": {
      const [queryVector] = await embedTexts([mode.query]);
      return rankChunksByQuery(allChunks, queryVector, DEFAULT_TOP_K);
    }
  }
}
