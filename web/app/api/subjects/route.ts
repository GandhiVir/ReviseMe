import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { subjects } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getUserId();
    const rows = await db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(desc(subjects.createdAt));
    return NextResponse.json(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Loading subjects failed: ${message}` }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const { name } = (await request.json()) as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [subject] = await db
      .insert(subjects)
      .values({ id: randomUUID(), userId, name: trimmed })
      .returning();

    return NextResponse.json(subject);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Creating subject failed: ${message}` }, { status: 502 });
  }
}
