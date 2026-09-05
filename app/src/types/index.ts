export type SourceType = "typed" | "ocr" | "voice" | "pdf";

export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface WeeklyNote {
  id: string;
  subjectId: string;
  weekNumber: number;
  date: string;
  rawText: string;
  sourceType: SourceType;
}

export interface Chunk {
  id: string;
  noteId: string;
  subjectId: string;
  text: string;
  embedding: number[];
  topic: string;
  weekNumber: number;
}

export interface TopicMastery {
  subjectId: string;
  topic: string;
  correctStreak: number;
  lastReviewed: string | null;
  nextDueDate: string;
  easeFactor: number;
}

export interface QuizQuestion {
  question: string;
  answer: string;
  sourceChunkIds: string[];
}

export interface QuizAttempt {
  id: string;
  subjectId: string;
  question: string;
  correctAnswer: string;
  sourceChunkIds: string[];
  userAnswer: string | null;
  wasCorrect: boolean | null;
  timestamp: string;
}

export type QuizMode =
  | { kind: "due" }
  | { kind: "weakSpots" }
  | { kind: "week"; weekNumber: number }
  | { kind: "topicQuery"; query: string };
