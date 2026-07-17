// SM-2 spaced-repetition algorithm (shared by card-progress + StudyPilot).

export interface Sm2Prev {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2Prev {
  nextReviewDate: string; // ISO yyyy-mm-dd
}

export function sm2Update(prev: Sm2Prev, quality: number): Sm2Result {
  let { easeFactor, intervalDays, repetitions } = prev;

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality >= 3) {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  } else {
    repetitions = 0;
    intervalDays = 0;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  const nextReviewDate = nextDate.toISOString().split("T")[0];

  return { easeFactor, intervalDays, repetitions, nextReviewDate };
}
