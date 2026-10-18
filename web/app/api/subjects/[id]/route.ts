import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { subjects } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";

// Notes, chunks, mastery and quiz attempts are removed by their ON DELETE CASCADE foreign keys.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    const deleted = await db
      .delete(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
      .returning({ id: subjects.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Deleting subject failed: ${message}` }, { status: 502 });
  }
}
