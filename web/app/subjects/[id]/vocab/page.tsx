import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chunks, subjects, weeklyNotes } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import { parseNote, type VocabEntry } from "@/lib/vocab";
import PageHeader from "../../../_components/PageHeader";
import VocabClient from "./VocabClient";

export const dynamic = "force-dynamic";

export default async function VocabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, userId))).limit(1);

  if (!subject) {
    return <PageHeader title="Vocabulary" subtitle="Subject not found" />;
  }

  const notes = await db
    .select()
    .from(weeklyNotes)
    .where(eq(weeklyNotes.subjectId, id))
    .orderBy(asc(weeklyNotes.weekNumber), asc(weeklyNotes.date));
  const topicRows = await db.select({ noteId: chunks.noteId, topic: chunks.topic }).from(chunks).where(eq(chunks.subjectId, id));
  const topicByNote = new Map(topicRows.map((r) => [r.noteId, r.topic]));

  const entries: VocabEntry[] = [];
  const other: { topic: string; weekNumber: number; lines: string[] }[] = [];
  for (const note of notes) {
    const topic = topicByNote.get(note.id) ?? "general";
    const parsed = parseNote(note.rawText, topic, note.weekNumber);
    entries.push(...parsed.entries);
    if (parsed.other.length > 0) other.push({ topic, weekNumber: note.weekNumber, lines: parsed.other });
  }

  return (
    <div>
      <PageHeader title="Vocabulary" subtitle={subject.name} />
      <VocabClient entries={entries} other={other} />
    </div>
  );
}
