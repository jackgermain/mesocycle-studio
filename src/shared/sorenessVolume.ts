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
import type { Program, TrainingDay, WorkSet } from "../data/types";
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

/** What each muscle's volume should do, judged from the check answered on this day.
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

/** What one recovery verdict changed, for the client's toast and the coach's desk. */
export interface RecoveryEdit {
  muscle: string;
  /** The session whose dose the verdict was about — the one that gets changed. */
  causedBy: string;
  causedByLabel: string;
  /** The session actually rewritten: next week's occurrence of `causedBy`. */
  target: string;
  sets: number;
  /** The accessory the set moved on. Null when the muscle has no accessory in that session, in which case
   * only the weight holds. */
  exercise: string | null;
  swap: boolean;
  reason: string;
}

/** One edit in a sentence, for the toast the client sees and the note the coach reads. Names the session
 * that changed, because it is deliberately NOT the one they are standing in. */
export function describeRecoveryEdit(e: RecoveryEdit): string {
  const where = `next ${e.causedByLabel}`;
  if (e.sets < 0) return `${e.muscle} still sore — a set comes off ${e.exercise} on ${where}, weight unchanged.`;
  if (e.sets > 0) return `${e.muscle} recovered early — a set goes on ${e.exercise} on ${where}.`;
  return `${e.muscle} still sore — ${where} holds its weight; every ${e.muscle} movement there is a major lift, so no set comes off.`;
}

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function trains(day: TrainingDay, muscle: string): boolean {
  return Object.values(day.exercises).some((e) => e.muscle === muscle);
}

/** Working sets — what a set count means everywhere else in the app. */
function working(ex: { sets: WorkSet[] }): WorkSet[] {
  return ex.sets.filter((s) => !s.isWarmup && !s.removed);
}

/** Applies a soreness check's verdicts to next week, on the session that CAUSED the soreness.
 *
 * > *"Then your Monday session volume would be reduced, because the Monday session is the reason that
 * > you're there on Friday getting ready to train and you're still sore."*
 *
 * This is why the adjustment cannot live inside the proposal for the day the question was answered on.
 * Train chest Monday and Friday, answer "still sore" on Friday, and the session that did too much was
 * Monday's — so next **Monday** comes down, not next Friday. The reading only exists on Friday, by which
 * time next Monday has already been programmed, so this amends it rather than producing it.
 *
 * Amending is safe: `applyProgressionToProgram` and this both refuse a session anyone has started, and next
 * week's sessions have not been trained yet by definition.
 *
 * Two things change together, per G142 and G144:
 * - every exercise for that muscle goes back to the weights and reps actually performed in the causing
 *   session, because *"keep the load the same when a muscle is still sore"* is about the muscle;
 * - one set moves on its last **accessory**, never on a major lift — and where it has no accessory, no set
 *   moves at all and only the hold applies.
 */
export function applyRecoveryToNextWeek(
  program: Program,
  answeredOn: string,
  isMajor: (name: string) => boolean,
  labelOf: (day: TrainingDay) => string,
): { program: Program; edits: RecoveryEdit[] } {
  const actions = volumeActionsForDay(program, answeredOn);
  if (actions.size === 0) return { program, edits: [] };

  const next = structuredClone(program);
  const days = next.weeks.flatMap((w, wi) => w.days.map((d, di) => ({ d, wi, di })));
  const here = days.find((x) => x.d.id === answeredOn);
  if (!here) return { program, edits: [] };
  const answers = here.d.sorenessAnswers ?? {};

  const edits: RecoveryEdit[] = [];
  for (const [muscle, action] of actions) {
    const gap = answers[muscle]?.lastTrainedDaysAgo;
    if (gap === undefined) continue;

    // The session that did the damage: `gap` days back, and it must actually train this muscle. Falling
    // back to the latest earlier day that trains it covers a date that has shifted since the answer.
    const wanted = shift(here.d.date, -gap);
    const candidates = days.filter((x) => x.d.date < here.d.date && trains(x.d, muscle));
    const cause = candidates.find((x) => x.d.date === wanted)
      ?? [...candidates].sort((a, b) => (a.d.date < b.d.date ? 1 : -1))[0];
    if (!cause) continue;

    const following = next.weeks[cause.wi + 1];
    if (!following) continue;
    const target = following.days.find((d) => d.code === cause.d.code) ?? following.days[cause.di];
    if (!target) continue;
    // Never rewrite a session someone has already started training.
    if (Object.values(target.exercises).some((e) => e.sets.some((s) => s.checked))) continue;

    const order = target.order.length ? target.order : Object.keys(target.exercises);
    const slots = order.map((id) => target.exercises[id]).filter((e) => e && !e.timed && e.muscle === muscle);
    if (slots.length === 0) continue;

    // The hold: back to what was actually performed in the causing session, exercise by exercise.
    for (const ex of slots) {
      const was = Object.values(cause.d.exercises).find((e) => e.name === ex.name);
      if (!was) continue;
      const performed = working(was).filter((s) => s.checked && s.actual);
      working(ex).forEach((s, i) => {
        const p = performed[i] ?? performed[performed.length - 1];
        if (!p?.actual) return;
        s.prescribed = { ...s.prescribed, reps: p.actual.reps, load: p.actual.load || s.prescribed.load };
      });
    }

    // The set: on the last accessory, never a major lift.
    const accessories = slots.filter((e) => !isMajor(e.name));
    const move = accessories[accessories.length - 1] ?? null;
    if (move && action.sets !== 0) {
      const sets = working(move);
      if (action.sets < 0 && sets.length > 1) {
        sets[sets.length - 1].removed = { reason: `Still sore — volume pulled back on ${muscle}` };
      } else if (action.sets > 0) {
        const last = sets[sets.length - 1];
        const copy = structuredClone(last);
        copy.id = `${last.id}-recovery`;
        copy.checked = false;
        copy.actual = null;
        delete copy.effort;
        delete copy.removed;
        move.sets.push(copy);
      }
    }

    edits.push({
      muscle,
      causedBy: cause.d.id,
      causedByLabel: labelOf(cause.d),
      target: target.id,
      sets: move ? action.sets : 0,
      exercise: move?.name ?? null,
      swap: action.swap,
      reason: action.reason,
    });
  }

  return edits.length ? { program: next, edits } : { program, edits: [] };
}
