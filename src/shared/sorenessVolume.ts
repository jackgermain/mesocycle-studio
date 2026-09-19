/** Turns the pre-session soreness check into a change to next week's set count.
 *
 * `generator/recoveryWindow.ts` has held the whole rule since it was written from Jack's own words — heal
 * the day before you train it again, cut on one bad reading, add only on two clear ones, swap the exercise
 * when a muscle keeps arriving unhealed. Nothing called any of it, so every answer anyone gave changed
 * nothing about their training. This is the wire between the two.
 *
 * Pure: no Supabase, no React, so every rule below is reachable from a test.
 *
 * ## The one rule that stops a reading being spent twice
 *
 * A muscle's action is only applied when its most recent reading came from **the session being proposed
 * from**. `computeSorenessDue` stops asking after `MAX_LOOKBACK_DAYS`, so a muscle can be trained on a day
 * the check never asked about — and without this rule that day's proposal would re-spend a reading an
 * earlier proposal had already acted on, cutting the same muscle twice for one bad week. Older readings
 * still count as *history*, which is what the two-confirmation add and the three-in-a-row swap need.
 *
 * ## The one-slot lag, stated rather than hidden
 *
 * A reading taken at the start of session S judges the dose of the session *before* it, and the proposal
 * from S is written into S+1. So the correction lands one slot after the dose it judged. That is inherent
 * to asking the question before training rather than after: the damage from today's session cannot be
 * known today. Both sessions are the same muscle in the same week of the same block, so the dose it
 * corrects is the same dose within a set or two.
 */
import type { Program, TrainingDay } from "../data/types";
import {
  judgeFromSoreness,
  judgeVolume,
  volumeActionFor,
  type VolumeAction,
  type VolumeVerdict,
} from "../generator/recoveryWindow";

export type SorenessAnswer = NonNullable<TrainingDay["sorenessAnswers"]>[string];

export interface Reading {
  dayId: string;
  date: string;
  verdict: VolumeVerdict;
}

/** How many of a muscle's readings are worth looking at. The add rule needs two and the swap rule three,
 * so four is one more than any rule can use — and readings older than that come from a different week of
 * the block at a different load, where they say little about today's dose. */
const HISTORY_DEPTH = 4;

/** One answer, read against the recovery-window rule.
 *
 * `recoveredOnDay` is the good case: it says *when* the soreness stopped, which is the only way to tell
 * "healed yesterday, exactly right" from "healed on Tuesday, three days of growth unbought". Without it
 * all a 5 says is that the muscle healed at some point, which `judgeFromSoreness` correctly calls
 * ambiguous rather than guessing. */
export function verdictForAnswer(a: SorenessAnswer): VolumeVerdict {
  if (a.recoveredOnDay !== undefined) return judgeVolume(a.lastTrainedDaysAgo, a.recoveredOnDay);
  return judgeFromSoreness(a.severity);
}

/** Every muscle's soreness readings up to and including `uptoDayId`, most recent first.
 *
 * Bounded at `uptoDayId` deliberately: re-running an old session's proposal must produce what it produced
 * at the time, not what a later week's answers would say. */
export function sorenessReadings(program: Program, uptoDayId: string): Map<string, Reading[]> {
  const days = program.weeks.flatMap((w) => w.days);
  const upto = days.find((d) => d.id === uptoDayId);
  if (!upto) return new Map();

  const answered = days
    .filter((d) => d.sorenessAnswers && d.date <= upto.date)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)); // newest first

  const out = new Map<string, Reading[]>();
  for (const day of answered) {
    for (const [muscle, answer] of Object.entries(day.sorenessAnswers!)) {
      if (typeof answer?.severity !== "number") continue;
      const list = out.get(muscle) ?? [];
      if (list.length >= HISTORY_DEPTH) continue;
      list.push({ dayId: day.id, date: day.date, verdict: verdictForAnswer(answer) });
      out.set(muscle, list);
    }
  }
  return out;
}

/** What each muscle's volume should do next week, for the session that was just finished.
 *
 * Only muscles whose newest reading belongs to this session appear — see the header. Muscles the rule has
 * nothing to say about are left out entirely rather than mapped to a no-op, so a caller iterating the map
 * is iterating real changes. */
export function volumeActionsForDay(program: Program, dayId: string): Map<string, VolumeAction> {
  const out = new Map<string, VolumeAction>();
  for (const [muscle, readings] of sorenessReadings(program, dayId)) {
    if (readings[0]?.dayId !== dayId) continue;
    const action = volumeActionFor(readings.map((r) => r.verdict));
    if (action.sets === 0 && !action.swap) continue;
    out.set(muscle, action);
  }
  return out;
}
