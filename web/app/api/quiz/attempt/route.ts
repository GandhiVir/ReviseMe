import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { quizAttempts, topicMastery } from "@/lib/db/schema";
import { assertSubjectOwnership } from "@/lib/ownership";
import { getUserId } from "@/lib/session";
import { newMastery, scheduleNextReview } from "@/lib/spacedRepetition";

interface AttemptBody {
  subjectId: string;
  topic: string;
  question: string;
  correctAnswer: string;
  sourceChunkIds: string[];
  userAnswer: string | null;
  wasCorrect: boolean;
}

export async function POST(request: Request) {
  const userId = await getUserId();
  const body = (await request.json()) as AttemptBody;

  if (!body.subjectId || !body.topic || !body.question) {
    return NextResponse.json({ error: "subjectId, topic, and question are required" }, { status: 400 });
  }
  if (!(await assertSubjectOwnership(body.subjectId, userId))) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  await db.insert(quizAttempts).values({
    id: randomUUID(),
    subjectId: body.subjectId,
    question: body.question,
    correctAnswer: body.correctAnswer,
    sourceChunkIds: body.sourceChunkIds,
    userAnswer: body.userAnswer,
    wasCorrect: body.wasCorrect,
  });

  const [existing] = await db
    .select()
    .from(topicMastery)
    .where(and(eq(topicMastery.subjectId, body.subjectId), eq(topicMastery.topic, body.topic)))
    .limit(1);

  const current = existing
    ? { correctStreak: existing.correctStreak, lastReviewed: existing.lastReviewed, nextDueDate: existing.nextDueDate, easeFactor: existing.easeFactor }
    : newMastery();

  const next = scheduleNextReview(current, body.wasCorrect);

  await db
    .insert(topicMastery)
    .values({ subjectId: body.subjectId, topic: body.topic, ...next })
    .onConflictDoUpdate({
      target: [topicMastery.subjectId, topicMastery.topic],
      set: next,
    });

  return NextResponse.json({ ok: true });
}
