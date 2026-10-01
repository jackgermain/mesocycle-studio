/** Which lifts go on the Progress tab.
 *
 * > *"Have the app pick the five main lifts, but have the option to change them, or remove how many of them
 * > are displayed."*
 *
 * ## One per movement pattern, heaviest first
 *
 * Ranking by load alone gives five leg machines on a leg-heavy block — a leg press and a hack squat both
 * outweigh a bench, and a screen showing both of those and no press is not a picture of anyone's training.
 * So the first pick in each PATTERN is taken before any pattern is picked from twice: squat, hinge,
 * horizontal push, vertical pull, horizontal pull, vertical push. That is the classic five without naming
 * five exercises anywhere, and it falls out of `patternOf`, which already exists and already encodes Jack's
 * own words about what is and is not a compound.
 *
 * Only major lifts are eligible (`isMajorLift`), and only ones with real logged work — an exercise written
 * into a program but never trained has nothing to show.
 *
 * ## His list wins
 *
 * `chosen` is the override. Set it and the automatic pick is not consulted at all, so a lift he put there
 * stays there even when it stops being his heaviest. `count` trims the automatic list only; an explicit
 * list of seven is seven.
 */
import type { Program, TrainingDay, WorkExercise } from "../data/types";
import { isMajorLift } from "./majorLift";
import { patternOf, type Pattern } from "../generator/patterns";

export const DEFAULT_MAIN_LIFT_COUNT = 5;

/** The order a lifter would read them in: the two that move the most weight, then push, then pull. */
const PATTERN_ORDER: Pattern[] = [
  "squat",
  "hinge",
  "horizontal push",
  "vertical pull",
  "horizontal pull",
  "vertical push",
  "single leg",
];

export interface LiftSummary {
  name: string;
  /** Heaviest load actually lifted on it, across the whole program. */
  topLoad: number;
  /** How many sessions it has been trained in — the tie-break, and what makes a staple beat a one-off. */
  sessions: number;
  pattern: Pattern | null;
}

function workingSets(ex: WorkExercise) {
  return ex.sets.filter((s) => !s.isWarmup && !s.removed && s.checked && s.actual);
}

/** Every major lift in the program that has been trained, with what it has been trained at. */
export function liftSummaries(program: Program): LiftSummary[] {
  const by = new Map<string, LiftSummary>();
  const days: TrainingDay[] = program.weeks.flatMap((w) => w.days);
  for (const day of days) {
    for (const ex of Object.values(day.exercises)) {
      if (ex.timed || !isMajorLift(ex.name)) continue;
      const done = workingSets(ex);
      if (done.length === 0) continue;
      const heaviest = Math.max(0, ...done.map((s) => s.actual?.load ?? 0));
      const prev = by.get(ex.name);
      if (prev) {
        prev.topLoad = Math.max(prev.topLoad, heaviest);
        prev.sessions += 1;
      } else {
        by.set(ex.name, {
          name: ex.name,
          topLoad: heaviest,
          sessions: 1,
          pattern: patternOf(ex.name)?.pattern ?? null,
        });
      }
    }
  }
  return [...by.values()];
}

const heaviestFirst = (a: LiftSummary, b: LiftSummary) =>
  b.topLoad - a.topLoad || b.sessions - a.sessions || a.name.localeCompare(b.name);

/** The lifts to show, in the order to show them.
 *
 * `chosen` is returned as given — his picks, his order — filtered only to names the program still contains,
 * so a lift swapped out of the block stops appearing rather than showing a stale row forever. */
export function pickMainLifts(
  program: Program,
  opts: { chosen?: string[]; count?: number } = {},
): string[] {
  const summaries = liftSummaries(program);

  if (opts.chosen && opts.chosen.length > 0) {
    const trained = new Set(summaries.map((s) => s.name));
    return opts.chosen.filter((n) => trained.has(n));
  }

  const count = Math.max(0, opts.count ?? DEFAULT_MAIN_LIFT_COUNT);
  const pool = [...summaries].sort(heaviestFirst);
  const picked: LiftSummary[] = [];
  const usedPatterns = new Set<Pattern>();

  // One per pattern first, in reading order, so a leg-heavy block cannot fill the screen with legs.
  for (const pattern of PATTERN_ORDER) {
    if (picked.length >= count) break;
    const best = pool.find((s) => s.pattern === pattern && !picked.includes(s));
    if (!best) continue;
    picked.push(best);
    usedPatterns.add(pattern);
  }

  // Then the heaviest of whatever is left, including second lifts from a pattern already used.
  for (const s of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(s)) picked.push(s);
  }

  return picked.slice(0, count).map((s) => s.name);
}
