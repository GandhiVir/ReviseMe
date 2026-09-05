import { getChunksForSubject } from "../db/database";
import { getTopicMastery } from "../db/database";
import { rankChunksByQuery } from "../embeddings/embed";
import { isDue, isWeakSpot } from "../spacedRepetition/sm2";
import type { Chunk, QuizMode } from "../types";

const DEFAULT_TOP_K = 8;

export async function retrieveChunksForQuiz(
  subjectId: string,
  mode: QuizMode
): Promise<Chunk[]> {
  const allChunks = await getChunksForSubject(subjectId);
  const mastery = await getTopicMastery(subjectId);

  switch (mode.kind) {
    case "due": {
      const dueTopics = new Set(mastery.filter(isDue).map((m) => m.topic));
      const matching = allChunks.filter((c) => dueTopics.has(c.topic));
      return matching.length > 0 ? matching.slice(0, DEFAULT_TOP_K) : allChunks.slice(0, DEFAULT_TOP_K);
    }
    case "weakSpots": {
      const weakTopics = new Set(mastery.filter(isWeakSpot).map((m) => m.topic));
      const matching = allChunks.filter((c) => weakTopics.has(c.topic));
      return matching.length > 0 ? matching.slice(0, DEFAULT_TOP_K) : allChunks.slice(0, DEFAULT_TOP_K);
    }
    case "week":
      return allChunks.filter((c) => c.weekNumber === mode.weekNumber);
    case "topicQuery":
      return rankChunksByQuery(allChunks, mode.query, DEFAULT_TOP_K);
  }
}
