import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/gemini";
import { generateQuizViaGroq } from "@/lib/groq";
import { assertSubjectOwnership } from "@/lib/ownership";
import { retrieveChunksForQuiz } from "@/lib/retrieval";
import { getUserId } from "@/lib/session";
import type { QuizMode } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const { subjectId, mode } = (await request.json()) as { subjectId: string; mode: QuizMode };

    if (!subjectId || !mode) {
      return NextResponse.json({ error: "subjectId and mode are required" }, { status: 400 });
    }
    if (!(await assertSubjectOwnership(subjectId, userId))) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const chunks = await retrieveChunksForQuiz(subjectId, mode);
    const noteInputs = chunks.map((c) => ({ id: c.id, text: c.text, topic: c.topic }));

    let questions;
    try {
      questions = await generateQuiz(noteInputs);
    } catch (geminiError) {
      const groqQuestions = await generateQuizViaGroq(noteInputs);
      if (groqQuestions === null) throw geminiError;
      questions = groqQuestions;
    }

    return NextResponse.json({ questions, chunks });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Quiz generation failed: ${message}` }, { status: 502 });
  }
}
