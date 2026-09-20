import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

// No login system — each browser gets an anonymous id in a cookie (see
// lib/session.ts), and every row is scoped to it. That's the minimum needed
// so two visitors to the public site don't see each other's notes; it's not
// a substitute for real auth if this ever needs to survive a cleared cookie
// jar or work across devices.

export const subjects = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("subjects_user_id_idx").on(table.userId)]
);

export const weeklyNotes = pgTable(
  "weekly_notes",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    rawText: text("raw_text").notNull(),
    sourceType: text("source_type").notNull(), // "typed" | "ocr" | "voice" | "pdf"
  },
  (table) => [index("weekly_notes_subject_id_idx").on(table.subjectId)]
);

export const chunks = pgTable(
  "chunks",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => weeklyNotes.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    embedding: jsonb("embedding").$type<number[]>().notNull(),
    topic: text("topic").notNull(),
    weekNumber: integer("week_number").notNull(),
  },
  (table) => [index("chunks_subject_id_idx").on(table.subjectId)]
);

export const topicMastery = pgTable(
  "topic_mastery",
  {
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    correctStreak: integer("correct_streak").notNull().default(0),
    lastReviewed: timestamp("last_reviewed", { withTimezone: true }),
    nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull().defaultNow(),
    easeFactor: real("ease_factor").notNull().default(2.5),
  },
  (table) => [primaryKey({ columns: [table.subjectId, table.topic] })]
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    sourceChunkIds: jsonb("source_chunk_ids").$type<string[]>().notNull(),
    userAnswer: text("user_answer"),
    wasCorrect: boolean("was_correct"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("quiz_attempts_subject_id_idx").on(table.subjectId)]
);
