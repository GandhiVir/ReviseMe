import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";
import type { Chunk, QuizAttempt, Subject, TopicMastery, WeeklyNote } from "../types";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("reviseme.db");
  await db.execAsync(SCHEMA_SQL);
  return db;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createSubject(name: string): Promise<Subject> {
  const database = await getDb();
  const subject: Subject = { id: newId(), name, createdAt: new Date().toISOString() };
  await database.runAsync(
    "INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)",
    subject.id,
    subject.name,
    subject.createdAt
  );
  return subject;
}

export async function listSubjects(): Promise<Subject[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: string; name: string; created_at: string }>(
    "SELECT id, name, created_at FROM subjects ORDER BY created_at DESC"
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function addWeeklyNote(note: Omit<WeeklyNote, "id">): Promise<WeeklyNote> {
  const database = await getDb();
  const id = newId();
  await database.runAsync(
    `INSERT INTO weekly_notes (id, subject_id, week_number, date, raw_text, source_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    note.subjectId,
    note.weekNumber,
    note.date,
    note.rawText,
    note.sourceType
  );
  return { id, ...note };
}

export async function addChunks(chunks: Chunk[]): Promise<void> {
  const database = await getDb();
  for (const chunk of chunks) {
    await database.runAsync(
      `INSERT INTO chunks (id, note_id, subject_id, text, embedding, topic, week_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      chunk.id,
      chunk.noteId,
      chunk.subjectId,
      chunk.text,
      JSON.stringify(chunk.embedding),
      chunk.topic,
      chunk.weekNumber
    );
  }
}

export async function getChunksForSubject(subjectId: string): Promise<Chunk[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: string;
    note_id: string;
    subject_id: string;
    text: string;
    embedding: string;
    topic: string;
    week_number: number;
  }>("SELECT * FROM chunks WHERE subject_id = ?", subjectId);
  return rows.map((r) => ({
    id: r.id,
    noteId: r.note_id,
    subjectId: r.subject_id,
    text: r.text,
    embedding: JSON.parse(r.embedding),
    topic: r.topic,
    weekNumber: r.week_number,
  }));
}

export async function upsertTopicMastery(mastery: TopicMastery): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO topic_mastery (subject_id, topic, correct_streak, last_reviewed, next_due_date, ease_factor)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(subject_id, topic) DO UPDATE SET
       correct_streak = excluded.correct_streak,
       last_reviewed = excluded.last_reviewed,
       next_due_date = excluded.next_due_date,
       ease_factor = excluded.ease_factor`,
    mastery.subjectId,
    mastery.topic,
    mastery.correctStreak,
    mastery.lastReviewed,
    mastery.nextDueDate,
    mastery.easeFactor
  );
}

export async function getTopicMastery(subjectId: string): Promise<TopicMastery[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    subject_id: string;
    topic: string;
    correct_streak: number;
    last_reviewed: string | null;
    next_due_date: string;
    ease_factor: number;
  }>("SELECT * FROM topic_mastery WHERE subject_id = ?", subjectId);
  return rows.map((r) => ({
    subjectId: r.subject_id,
    topic: r.topic,
    correctStreak: r.correct_streak,
    lastReviewed: r.last_reviewed,
    nextDueDate: r.next_due_date,
    easeFactor: r.ease_factor,
  }));
}

export async function recordQuizAttempt(attempt: QuizAttempt): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO quiz_attempts (id, subject_id, question, correct_answer, source_chunk_ids, user_answer, was_correct, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    attempt.id,
    attempt.subjectId,
    attempt.question,
    attempt.correctAnswer,
    JSON.stringify(attempt.sourceChunkIds),
    attempt.userAnswer,
    attempt.wasCorrect === null ? null : attempt.wasCorrect ? 1 : 0,
    attempt.timestamp
  );
}
