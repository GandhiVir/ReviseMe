import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/gemini";
import { assertSubjectOwnership } from "@/lib/ownership";
import { retrieveChunksForQuiz } from "@/lib/retrieval";
import { getUserId } from "@/lib/session";
import type { QuizMode } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await getUserId();
  const { subjectId, mode } = (await request.json()) as { subjectId: string; mode: QuizMode };

  if (!subjectId || !mode) {
    return NextResponse.json({ error: "subjectId and mode are required" }, { status: 400 });
  }
  if (!(await assertSubjectOwnership(subjectId, userId))) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const chunks = await retrieveChunksForQuiz(subjectId, mode);
  const questions = await generateQuiz(chunks.map((c) => ({ id: c.id, text: c.text, topic: c.topic })));

  return NextResponse.json({ questions, chunks });
}
