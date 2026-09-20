import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { chunks as chunksTable, weeklyNotes } from "@/lib/db/schema";
import { chunkText } from "@/lib/embeddings";
import { embedTexts } from "@/lib/gemini";
import { assertSubjectOwnership } from "@/lib/ownership";
import { getUserId } from "@/lib/session";
import type { SourceType } from "@/lib/types";

interface IngestBody {
  subjectId: string;
  weekNumber: number;
  rawText: string;
  topic: string;
  sourceType: SourceType;
}

export async function POST(request: Request) {
  const userId = await getUserId();
  const body = (await request.json()) as IngestBody;

  if (!body.subjectId || !body.rawText?.trim() || !body.topic?.trim()) {
    return NextResponse.json({ error: "subjectId, rawText, and topic are required" }, { status: 400 });
  }

  if (!(await assertSubjectOwnership(body.subjectId, userId))) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const [note] = await db
    .insert(weeklyNotes)
    .values({
      id: randomUUID(),
      subjectId: body.subjectId,
      weekNumber: body.weekNumber || 1,
      rawText: body.rawText,
      sourceType: body.sourceType,
    })
    .returning();

  const texts = chunkText(body.rawText);
  const embeddings = await embedTexts(texts);

  const chunkRows = texts.map((text, i) => ({
    id: randomUUID(),
    noteId: note.id,
    subjectId: body.subjectId,
    text,
    embedding: embeddings[i],
    topic: body.topic.trim(),
    weekNumber: body.weekNumber || 1,
  }));

  await db.insert(chunksTable).values(chunkRows);

  return NextResponse.json(note);
}
