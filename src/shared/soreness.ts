import type { Program, TrainingDay } from "../data/types";

/** Coarse, muscle-group-level synergist relationships -- e.g. rows and pulldowns on back day meaningfully
 * fatigue biceps too, presses on chest day meaningfully fatigue triceps. Deliberately conservative (only
 * the well-established compound-lift overlaps) rather than exhaustive per-exercise EMG modeling, since the
 * exercise library only tags one primary muscle per movement. */
const SECONDARY_MUSCLES: Record<string, string[]> = {
  Chest: ["Triceps", "Front delts"],
  Back: ["Biceps", "Rear delts", "Forearms"],
  "Front delts": ["Triceps"],
  Quads: ["Glutes", "Adductors"],
  Hamstrings: ["Glutes"],
  Glutes: ["Hamstrings"],
  Traps: ["Back"],
  Forearms: ["Biceps"],
  "Full body": ["Back", "Quads", "Glutes", "Traps"],
};

function musclesWorked(day: TrainingDay): Set<string> {
  const set = new Set<string>();
  for (const ex of Object.values(day.exercises)) {
    set.add(ex.muscle);
    for (const secondary of SECONDARY_MUSCLES[ex.muscle] ?? []) set.add(secondary);
  }
  return set;
}

function daysBetween(earlierIso: string, laterIso: string): number {
  const ms = new Date(`${laterIso}T00:00:00`).getTime() - new Date(`${earlierIso}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** Beyond this many days, a muscle counts as fully recovered by default -- no point asking "is this still
 * sore" about something trained over a week and a half ago. */
const MAX_LOOKBACK_DAYS = 10;

/** Muscles today's session is about to work (as a primary OR secondary mover) that were also worked in a
 * recently-completed day -- e.g. biceps get asked about on back day after being hit as a synergist two
 * days earlier on pull day, triceps on chest day after overhead pressing. Surfaced as a pre-session "is
 * this healed" check so a coach can see when a muscle's actual recovery lags its programmed frequency,
 * which is the real signal for whether that muscle's volume is set too high. */
export function computeSorenessDue(program: Program, dayId: string): { muscle: string; lastTrainedDaysAgo: number }[] {
  let target: TrainingDay | null = null;
  const doneDays: TrainingDay[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      if (day.id === dayId) target = day;
      if (day.status === "done") doneDays.push(day);
    }
  }
  if (!target) return [];

  const todayMuscles = musclesWorked(target);
  const priorDays = doneDays.filter((d) => d.date < target!.date).sort((a, b) => b.date.localeCompare(a.date));

  const due: { muscle: string; lastTrainedDaysAgo: number }[] = [];
  for (const muscle of todayMuscles) {
    const lastDay = priorDays.find((d) => musclesWorked(d).has(muscle));
    if (!lastDay) continue;
    const gap = daysBetween(lastDay.date, target.date);
    if (gap <= MAX_LOOKBACK_DAYS) due.push({ muscle, lastTrainedDaysAgo: gap });
  }
  return due.sort((a, b) => a.lastTrainedDaysAgo - b.lastTrainedDaysAgo);
}
