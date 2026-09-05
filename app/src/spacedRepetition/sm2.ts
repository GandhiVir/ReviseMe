import type { TopicMastery } from "../types";

const MIN_EASE_FACTOR = 1.3;
const INTERVAL_DAYS_BY_STREAK = [1, 3, 7, 14, 30]; // days after 1st..5th consecutive correct answer

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Simplified SM-2: correct answers grow the streak and push the review out
 * further (scaled by ease factor); a wrong answer resets the streak and
 * schedules an almost-immediate re-review, and nudges ease factor down so
 * that topic keeps coming back sooner over time.
 */
export function scheduleNextReview(
  mastery: TopicMastery,
  wasCorrect: boolean
): TopicMastery {
  const now = new Date().toISOString();

  if (!wasCorrect) {
    return {
      ...mastery,
      correctStreak: 0,
      lastReviewed: now,
      nextDueDate: daysFromNow(0.5),
      easeFactor: Math.max(MIN_EASE_FACTOR, mastery.easeFactor - 0.2),
    };
  }

  const newStreak = mastery.correctStreak + 1;
  const baseInterval =
    INTERVAL_DAYS_BY_STREAK[Math.min(newStreak, INTERVAL_DAYS_BY_STREAK.length) - 1];
  const interval = Math.round(baseInterval * mastery.easeFactor);

  return {
    ...mastery,
    correctStreak: newStreak,
    lastReviewed: now,
    nextDueDate: daysFromNow(interval),
    easeFactor: mastery.easeFactor + 0.05,
  };
}

export function newMastery(subjectId: string, topic: string): TopicMastery {
  return {
    subjectId,
    topic,
    correctStreak: 0,
    lastReviewed: null,
    nextDueDate: new Date().toISOString(),
    easeFactor: 2.5,
  };
}

export function isDue(mastery: TopicMastery): boolean {
  return new Date(mastery.nextDueDate).getTime() <= Date.now();
}

export function isWeakSpot(mastery: TopicMastery): boolean {
  return mastery.correctStreak <= 1;
}
