export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_notes (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  week_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  source_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES weekly_notes(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  text TEXT NOT NULL,
  embedding TEXT NOT NULL,
  topic TEXT NOT NULL,
  week_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_mastery (
  subject_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT,
  next_due_date TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  PRIMARY KEY (subject_id, topic)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  source_chunk_ids TEXT NOT NULL,
  user_answer TEXT,
  was_correct INTEGER,
  timestamp TEXT NOT NULL
);
`;
