export interface VocabEntry {
  original: string;
  pronunciation: string;
  translation: string;
  topic: string;
  weekNumber: number;
}

// OCR'd vocab is stored as "original : pronunciation : translation" per line (see formatVocab in gemini.ts).
export function parseNote(rawText: string, topic: string, weekNumber: number) {
  const entries: VocabEntry[] = [];
  const other: string[] = [];

  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(" : ").map((p) => p.trim());
    if (parts.length >= 3) {
      entries.push({ original: parts[0], pronunciation: parts[1], translation: parts.slice(2).join(" : "), topic, weekNumber });
    } else if (parts.length === 2 && parts[0] && parts[1]) {
      entries.push({ original: parts[0], pronunciation: "", translation: parts[1], topic, weekNumber });
    } else {
      other.push(trimmed);
    }
  }

  return { entries, other };
}
