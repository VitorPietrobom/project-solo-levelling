export interface SessionExercise {
  sets: number;
  reps: number;
  weight: number;
  muscleGroups: { muscleGroup: string }[];
}

export interface SessionData {
  date: Date | string;
  exercises: SessionExercise[];
}

/**
 * Calculates soreness intensity (0–100) per muscle group from recent gym sessions.
 *
 * For each muscle group, sums volume (sets × reps × weight) weighted by recency:
 *   weightedVolume += volume * (1 - daysAgo / 7)
 *
 * Then normalizes so the highest-scoring group = 100.
 * Groups with no exercises = 0.
 */
export function calculateSoreness(
  sessions: SessionData[],
  asOfDate: Date,
): Map<string, number> {
  const scores = new Map<string, number>();

  const asOfTime = asOfDate.getTime();
  const msPerDay = 86_400_000;

  for (const session of sessions) {
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    const daysAgo = (asOfTime - sessionDate.getTime()) / msPerDay;

    if (daysAgo < 0 || daysAgo > 7) continue;

    const recencyWeight = 1 - daysAgo / 7;

    for (const exercise of session.exercises) {
      // For bodyweight exercises (weight=0), use reps as the effort factor
      const effort = exercise.weight > 0 ? exercise.weight : exercise.reps;
      const volume = exercise.sets * exercise.reps * effort;
      const weighted = volume * recencyWeight;

      for (const mg of exercise.muscleGroups) {
        const group = mg.muscleGroup;
        scores.set(group, (scores.get(group) ?? 0) + weighted);
      }
    }
  }

  // Normalize to 0–100
  let maxScore = 0;
  for (const val of scores.values()) {
    if (val > maxScore) maxScore = val;
  }

  const result = new Map<string, number>();
  if (maxScore === 0) return result;

  for (const [group, val] of scores) {
    result.set(group, Math.round((val / maxScore) * 100));
  }

  return result;
}
