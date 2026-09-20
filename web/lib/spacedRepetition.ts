// Ported from the mobile app's src/spacedRepetition/sm2.ts — same algorithm,
// same tuning, adapted to Date objects instead of SQLite ISO strings.

export interface TopicMasteryState {
  correctStreak: number;
  lastReviewed: Date | null;
  nextDueDate: Date;
  easeFactor: number;
}

const MIN_EASE_FACTOR = 1.3;
const INTERVAL_DAYS_BY_STREAK = [1, 3, 7, 14, 30];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function scheduleNextReview(mastery: TopicMasteryState, wasCorrect: boolean): TopicMasteryState {
  const now = new Date();

  if (!wasCorrect) {
    return {
      correctStreak: 0,
      lastReviewed: now,
      nextDueDate: daysFromNow(0.5),
      easeFactor: Math.max(MIN_EASE_FACTOR, mastery.easeFactor - 0.2),
    };
  }

  const newStreak = mastery.correctStreak + 1;
  const baseInterval = INTERVAL_DAYS_BY_STREAK[Math.min(newStreak, INTERVAL_DAYS_BY_STREAK.length) - 1];
  const interval = Math.round(baseInterval * mastery.easeFactor);

  return {
    correctStreak: newStreak,
    lastReviewed: now,
    nextDueDate: daysFromNow(interval),
    easeFactor: mastery.easeFactor + 0.05,
  };
}

export function newMastery(): TopicMasteryState {
  return { correctStreak: 0, lastReviewed: null, nextDueDate: new Date(), easeFactor: 2.5 };
}

export function isDue(mastery: { nextDueDate: Date }): boolean {
  return mastery.nextDueDate.getTime() <= Date.now();
}

export function isWeakSpot(mastery: { correctStreak: number }): boolean {
  return mastery.correctStreak <= 1;
}
