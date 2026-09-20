export type SourceType = "typed" | "ocr" | "voice" | "pdf";

export interface Chunk {
  id: string;
  noteId: string;
  subjectId: string;
  text: string;
  embedding: number[];
  topic: string;
  weekNumber: number;
}

export interface QuizQuestion {
  question: string;
  answer: string;
  sourceChunkIds: string[];
}

export type QuizMode =
  | { kind: "due" }
  | { kind: "weakSpots" }
  | { kind: "week"; weekNumber: number }
  | { kind: "topicQuery"; query: string };
