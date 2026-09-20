import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { topicMastery } from "@/lib/db/schema";
import { assertSubjectOwnership } from "@/lib/ownership";
import { getUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await getUserId();
  const subjectId = new URL(request.url).searchParams.get("subjectId");

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  if (!(await assertSubjectOwnership(subjectId, userId))) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const rows = await db.select().from(topicMastery).where(eq(topicMastery.subjectId, subjectId));
  return NextResponse.json(rows);
}
