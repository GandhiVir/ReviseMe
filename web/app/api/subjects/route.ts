import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { subjects } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  const rows = await db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(desc(subjects.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
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
}
