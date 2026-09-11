/** Next week's numbers for a finished session, proposed exercise by exercise.
 *
 * A proposal, not a prescription: nothing here writes to a program. It is sent for review -- to the
 * person's coach, or to a coach's own desk when they are training themselves -- and whoever reviews it
 * decides. No Supabase import, so every rule below can be reached from a test.
 *
 * Built only from rules already in doctrine:
 *   G62  the how-hard rating on the last set decides the size of the move; a 5 holds the weight
 *   G64  each week of a block aims at a harder rating than the last, peaking at 5
 *   G65  at the end of a block, where each lift finished is what the next block starts from
 *   G73  a light weight moves only once the top of the range is beaten -- the step is a big percentage
 *   C7a  at five or more sessions a week, the block's last week is the deload
 *   Model C (doubleProgression.ts) -- stagger a load jump across the sets, level the laggards before
 *   jumping again, and land promoted sets on the bottom of the rep band
 */
import type { Equipment, Program, TrainingDay, TrainingWeek } from "../data/types";
import {
  addReps, holdAndLoad, isLightLoad, jumpLoad, levelUp, needsScheduledDeload, nextLoadUp, type PerformedSet,
} from "../generator/doubleProgression";
import { bandForReps } from "../generator/repRanges";
import { equipmentOf } from "../screens/exerciseHelpers";

export interface ProposalInput {
  name: string;
  equipment: Equipment;
  /** Working sets as logged, in order -- warm-ups, removed and unticked sets already left out. */
  sets: PerformedSet[];
  /** The rep target the sets were prescribed at, when there is a number to read. */
  targetReps: number | null;
  /** How hard the final working set was, 1..5. */
  effort: number | null;
  week: number;
  totalWeeks: number;
  sessionsPerWeek: number;
  units: string;
}

export type MoveKind = "load" | "stagger" | "level" | "reps" | "hold" | "deload" | "finished";

export interface Proposal {
  exercise: string;
  logged: string;
  effort: number | null;
  next: string;
  /** The proposed sets as numbers, for writing into next week on approval. Absent on proposals sent before
   * approval existed -- parseSets reads those back off `next`. */
  nextSets?: PerformedSet[];
  move: MoveKind;
  label: string;
  why: string;
}

/** "2 × 8 @ 145 lb, 1 × 10 @ 135 lb" -- sets grouped the way a coach says them out loud. */
export function formatSets(sets: PerformedSet[], units: string): string {
  const groups: { reps: number; load: number | null; count: number }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.reps === s.reps && last.load === s.load) last.count++;
    else groups.push({ reps: s.reps, load: s.load, count: 1 });
  }
  return groups.map((g) => `${g.count} × ${g.reps} @ ${g.load === null ? "BW" : `${g.load} ${units}`}`).join(", ");
}

/** G64 on the 1-5 how-hard scale: week one lands around 3 and the last training week at 5, evenly
 * between, to the nearest half. A four-week block with no deload aims 3, 3.5, 4.5, 5. */
export function targetEffortFor(week: number, lastTrainingWeek: number): number {
  if (lastTrainingWeek <= 1) return 5;
  const w = Math.min(Math.max(week, 1), lastTrainingWeek);
  return Math.round((3 + (2 * (w - 1)) / (lastTrainingWeek - 1)) * 2) / 2;
}

function targetText(t: number): string {
  return Number.isInteger(t) ? String(t) : `${Math.floor(t)}–${Math.ceil(t)}`;
}

export function proposeNextWeek(i: ProposalInput): Proposal {
  const logged = formatSets(i.sets, i.units);
  const out = (move: MoveKind, next: PerformedSet[], label: string, why: string): Proposal => ({
    exercise: i.name, logged, effort: i.effort, next: formatSets(next, i.units), nextSets: next, move, label, why,
  });
  const hold = (why: string, label = "Hold") => out("hold", i.sets, label, why);

  const deload = i.totalWeeks >= 2 && needsScheduledDeload(i.sessionsPerWeek);
  const lastTraining = deload ? i.totalWeeks - 1 : i.totalWeeks;
  const e = i.effort;

  if (i.week >= i.totalWeeks) {
    const best = [...i.sets].sort((a, b) => (b.load ?? 0) - (a.load ?? 0) || b.reps - a.reps)[0];
    return out(
      "finished", i.sets, "Block finished",
      `G65: the next block starts from here — top set ${formatSets([best], i.units).replace(/^1 × /, "")}${e ? ` at how hard ${e}` : ""}.`,
    );
  }
  if (i.week + 1 > lastTraining) {
    const half = i.sets.slice(0, Math.max(1, Math.round(i.sets.length / 2)));
    return out("deload", half, "Deload", `C7a: at ${i.sessionsPerWeek} sessions a week the block's last week is the deload — half the sets, same weight.`);
  }
  // A barbell bench with no weight on any set is not bodyweight work -- the weight simply wasn't entered,
  // which is what ticking sets straight off a program with no weights in it looks like. Proposing reps for
  // it as if it were a push-up would be confidently wrong.
  if (i.equipment !== "bodyweight" && i.sets.every((s) => s.load === null)) {
    return hold("No weight was logged, so there's nothing to progress from. Log the weight next session.", "Log the weight");
  }
  if (e === null) return hold("No how-hard rating on the last set, so nothing moves until there is one.");

  const target = targetEffortFor(i.week + 1, lastTraining);
  const gap = target - e;
  const reps = i.sets.map((s) => s.reps);
  const [lo, hi] = bandForReps(i.targetReps ?? Math.max(...reps));
  const band = { min: lo, max: hi };
  const loads = i.sets.map((s) => s.load);
  const bodyweight = loads.every((l) => l === null);
  const heaviest = Math.max(0, ...loads.map((l) => l ?? 0));
  const allAtTop = reps.every((r) => r >= hi);
  const averageReps = reps.reduce((a, b) => a + b, 0) / reps.length;

  // Short of the band's floor, not of the written target: a staggered jump deliberately lands its promoted
  // sets at the bottom of the band, and reading that as a miss would hold every week that follows one.
  if (i.targetReps !== null && averageReps < Math.min(i.targetReps, lo)) {
    return hold(`Reps came in under ${Math.min(i.targetReps, lo)}, so they get made before anything else moves.`, "Repeat — make the reps");
  }
  if (e >= 5) {
    if (allAtTop) return hold("G62: a 5 at the top of the range — there was nothing left, so nothing moves.");
    return out("reps", addReps(i.sets, band, 1), "Same weight, +1 rep", "G62: a 5 means there was nothing left — the weight holds.");
  }
  if (!bodyweight && new Set(loads).size > 1) {
    return out("level", levelUp(i.sets), "Level up", "Finish the jump already started: every set to the top weight before the next jump.");
  }
  if (bodyweight) {
    if (allAtTop) return hold("Top of the range on bodyweight — make the movement harder rather than adding reps.", "Top of the range");
    const by = e <= 2 ? 2 : 1;
    return out(
      "reps", addReps(i.sets, band, by), `+${by} rep${by > 1 ? "s" : ""}`,
      e <= 2 ? `G62: a ${e} means it was too light — reps climb faster.` : `G64: rated ${e}, next week aims at ${targetText(target)}.`,
    );
  }

  const step = nextLoadUp(i.equipment, heaviest) - heaviest;
  const stepText = `+${Number.isInteger(step) ? step : step.toFixed(1)} ${i.units}`;
  const unchanged = (next: PerformedSet[]) => formatSets(next, i.units) === logged;

  if (isLightLoad(heaviest, i.equipment)) {
    if (reps.every((r) => r > hi)) {
      const next = jumpLoad(i.sets, { equipment: i.equipment, band, promote: i.sets.length });
      if (unchanged(next)) return hold("No heavier weight on this equipment — reps carry it from here.");
      return out("load", next, `${stepText}, back to ${lo} reps`, `G73: the top of the range was beaten on a light weight — one step up, and the reps start again from ${lo}.`);
    }
    if (allAtTop) return hold(`G73: on a light weight the next step is a big percentage — it waits until every set beats ${hi} reps.`, "Beat the top of the range");
    if (gap < 0.25) return hold(`G64: rated ${e}, already at next week's target of ${targetText(target)}.`);
    const by = e <= 2 ? 2 : 1;
    return out("reps", addReps(i.sets, band, by), `+${by} rep${by > 1 ? "s" : ""}`, `G73: light weight, so reps climb before the weight does. Rated ${e}, next week aims at ${targetText(target)}.`);
  }

  if (e <= 2) {
    const next = holdAndLoad(i.sets, i.equipment);
    if (unchanged(next)) return hold("No heavier weight on this equipment — reps carry it from here.");
    return out("load", next, `${stepText}, every set`, `G62: a ${e} means it was too light — every set moves up.`);
  }
  if (gap >= 0.75 || (allAtTop && gap >= 0.25)) {
    const moved = Math.max(1, i.sets.length - 1);
    const next = jumpLoad(i.sets, { equipment: i.equipment, band, promote: moved });
    if (unchanged(next)) return hold("No heavier weight on this equipment — reps carry it from here.");
    return out(
      "stagger", next, i.sets.length > 1 ? `${stepText} on ${moved} of ${i.sets.length} sets` : stepText,
      allAtTop
        ? `Top of the range reached — most sets move up and drop to ${lo} reps; the set left behind catches up next.`
        : `G64: rated ${e}, next week aims at ${targetText(target)} — the jump is staggered so one set catches up after.`,
    );
  }
  if (gap >= 0.25 && !allAtTop) {
    return out("reps", addReps(i.sets, band, 1), "+1 rep", `G64: rated ${e}, next week aims at ${targetText(target)} — nearly there.`);
  }
  return hold(`G64: rated ${e}, already at next week's target of ${targetText(target)}.`);
}

export interface DayProposals {
  dayId: string;
  week: number;
  totalWeeks: number;
  proposals: Proposal[];
}

function locateDay(program: Program, dayId: string): { day: TrainingDay; week: TrainingWeek } | null {
  for (const week of program.weeks) {
    const day = week.days.find((d) => d.id === dayId);
    if (day) return { day, week };
  }
  return null;
}

/** Every exercise in a finished session that has something to propose from. Timed exercises are left out
 * -- their "reps" are seconds, and none of the rules above were written for holds. */
export function proposalsForDay(program: Program, dayId: string, units: string): DayProposals | null {
  const found = locateDay(program, dayId);
  if (!found) return null;
  const { day, week } = found;
  const totalWeeks = program.totalWeeks || program.weeks.length;
  // The widest week, not this one: a partial week 0 has fewer days than the block really trains.
  const sessionsPerWeek = Math.max(0, ...program.weeks.map((w) => w.days.length));
  const ids = day.order.length ? day.order : Object.keys(day.exercises);
  const proposals: Proposal[] = [];
  for (const id of ids) {
    const ex = day.exercises[id];
    if (!ex || ex.timed) continue;
    const working = ex.sets.filter((s) => !s.isWarmup && !s.removed && s.checked && s.actual);
    if (working.length === 0) continue;
    const targets = working
      .map((s) => (typeof s.prescribed.reps === "number" ? s.prescribed.reps : parseInt(String(s.prescribed.reps), 10)))
      .filter((n) => Number.isFinite(n) && n > 0);
    // The final set's rating is the one asked for (G62). Falling back to the last set that has one covers
    // a session where the final set was removed after it was rated.
    const rated = [...working].reverse().find((s) => typeof s.effort === "number");
    proposals.push(proposeNextWeek({
      name: ex.name,
      equipment: equipmentOf(ex),
      // A load of 0 is how some screens record bodyweight; treated as none, or it would read as a 0 lb
      // "light weight" and get a 2.5 lb jump proposed.
      sets: working.map((s) => ({ reps: s.actual!.reps, load: s.actual!.load ? s.actual!.load : null })),
      targetReps: targets.length ? Math.max(...targets) : null,
      effort: rated?.effort ?? null,
      week: week.number,
      totalWeeks,
      sessionsPerWeek,
      units,
    }));
  }
  return { dayId, week: week.number, totalWeeks, proposals };
}

function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The most recent finished session whose proposals have not been sent yet.
 *
 * Only looks back `withinDays`. Sessions finished before this existed have no sent mark either, and
 * without a window the first open after deploy would send someone's entire training history. */
export function progressionDueDay(program: Program, todayIso: string, withinDays = 3): string | null {
  const cutoff = shiftIso(todayIso, -withinDays);
  let best: TrainingDay | null = null;
  for (const week of program.weeks) {
    for (const day of week.days) {
      if (!day.feedbackDone || day.progressionSentAt) continue;
      if (day.date < cutoff || day.date > todayIso) continue;
      if (!best || day.date > best.date) best = day;
    }
  }
  return best?.id ?? null;
}

/** Who reviews a session's proposals: the person's coach, or a coach's own desk when they are training
 * themselves (migration 0027 lets only that one self-addressed kind through). Anyone else has nobody. */
export function progressionRecipient(account: { id: string; role: string; coach_id: string | null }): string | null {
  return account.coach_id ?? (account.role === "coach" ? account.id : null);
}

/** A reviewer's verdict on one proposal. Kept inside the payload, next to the exact numbers it judged, so
 * the training data can never be separated from what the engine actually proposed. */
export interface ProposalReview {
  /** Approved as proposed, or edited before it went in. An edit is the most useful training data there is:
   * the exact numbers the coach wanted instead, and why. */
  verdict: "approved" | "edited";
  /** What went into next week -- the proposal's own sets when approved. */
  sets: PerformedSet[];
  /** Why it was changed. Required on an edit, absent on an approval. */
  note?: string;
  at: string;
  /** False when nothing could be written: next week's session already started, or there is no next week. */
  applied: boolean;
}

export interface ProgressionPayload {
  v: 1;
  week: number;
  totalWeeks: number;
  proposals: Proposal[];
  /** The session these came from. Also in the signal's day_id column, which not every database has. */
  dayId?: string;
  /** Keyed by the proposal's index. */
  reviews?: Record<string, ProposalReview>;
  /** When the last exercise was submitted. */
  completedAt?: string;
}

export function encodeProgression(p: DayProposals): string {
  const payload: ProgressionPayload = { v: 1, week: p.week, totalWeeks: p.totalWeeks, dayId: p.dayId, proposals: p.proposals };
  return JSON.stringify(payload);
}

/** Never throws: a signal's detail is free text on every other kind, and a malformed one should show
 * nothing rather than take the desk down. */
export function decodeProgression(detail: string | null | undefined): ProgressionPayload | null {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as Partial<ProgressionPayload>;
    if (parsed?.v !== 1 || !Array.isArray(parsed.proposals)) return null;
    return parsed as ProgressionPayload;
  } catch {
    return null;
  }
}

/** A signal's payload, wherever it landed. While day_id was missing from the database, a failed insert was
 * retried with the payload folded into `note`, so at least one real notification carries it there. */
export function readProgression(signal: { detail?: string | null; note?: string | null }): ProgressionPayload | null {
  return decodeProgression(signal.detail) ?? decodeProgression(signal.note);
}

/** The reason without its rule number, for a screen meant to be read at a glance. The number stays in the
 * stored payload, where it is what ties a verdict back to the rule that produced it. */
export function plainWhy(why: string): string {
  return why
    .replace(/^(?:G\d+(?: \+ G\d+)*|C7a):\s*/, "")
    .replace(/\s*\((?:G\d+(?:, G\d+)*|Model C)\)/g, "")
    .replace(/^./, (c) => c.toUpperCase());
}

/** The sets a proposal suggests, as numbers. */
export function proposedSets(p: Proposal): PerformedSet[] | null {
  return p.nextSets ?? parseSets(p.next);
}

export function encodeProgressionPayload(p: ProgressionPayload): string {
  return JSON.stringify(p);
}

/** Reads formatSets' own output back into sets: "2 × 8 @ 140 lb, 1 × 10 @ 135 lb". Only for proposals sent
 * before `nextSets` was stored; null for anything that isn't that exact shape, so nothing is guessed. */
export function parseSets(text: string): PerformedSet[] | null {
  const out: PerformedSet[] = [];
  for (const part of text.split(", ")) {
    const m = part.match(/^(\d+) × (\d+) @ (BW|[\d.]+)(?: \S+)?$/);
    if (!m) return null;
    const load = m[3] === "BW" ? null : Number(m[3]);
    for (let i = 0; i < Number(m[1]); i++) out.push({ reps: Number(m[2]), load });
  }
  return out.length ? out : null;
}

/** Writes approved proposals into next week's occurrence of the session they came from.
 *
 * "Next week's occurrence" is the same day code one week on, falling back to the same position in the
 * week. A session that has already been started is never touched -- rewriting sets someone has trained
 * would falsify them -- and neither is the week after the last. Warm-ups are left alone. Where approval
 * proposes fewer sets than the session has (a deload), the extra ones are removed with that reason, which
 * is how a set comes out of a session everywhere else in the app. */
export function applyProgressionToProgram(
  program: Program,
  sourceDayId: string,
  payload: ProgressionPayload,
  setsFor: (index: number, proposal: Proposal) => PerformedSet[] | null,
): { program: Program; touched: number } {
  const next = structuredClone(program);
  let weekIdx = -1;
  let dayIdx = -1;
  next.weeks.forEach((w, wi) => w.days.forEach((d, di) => {
    if (d.id === sourceDayId) {
      weekIdx = wi;
      dayIdx = di;
    }
  }));
  if (weekIdx < 0) return { program, touched: 0 };
  const source = next.weeks[weekIdx].days[dayIdx];
  const following = next.weeks[weekIdx + 1];
  if (!following) return { program, touched: 0 };
  const target = following.days.find((d) => d.code === source.code) ?? following.days[dayIdx];
  if (!target) return { program, touched: 0 };
  if (Object.values(target.exercises).some((ex) => ex.sets.some((s) => s.checked))) return { program, touched: 0 };

  let touched = 0;
  payload.proposals.forEach((p, i) => {
    if (p.move === "finished") return;
    const sets = setsFor(i, p);
    if (!sets || sets.length === 0) return;
    const ex = Object.values(target.exercises).find((e) => e.name === p.exercise);
    if (!ex || ex.timed) return;
    const working = ex.sets.filter((s) => !s.isWarmup && !s.removed);
    if (working.length === 0) return;
    working.forEach((s, k) => {
      const want = sets[k];
      if (!want) {
        s.removed = { reason: p.move === "deload" ? "Deload" : "Approved progression" };
        return;
      }
      // A suggestion with no weight never erases one that is programmed: "no weight" there means nobody
      // entered one, not that the lift became bodyweight.
      s.prescribed = { ...s.prescribed, reps: want.reps, load: want.load ?? s.prescribed.load };
    });
    // An edit can ask for more sets than next week has. They are copies of its last working set, so they
    // keep the same rest, effort target and set type.
    const last = working[working.length - 1];
    for (let k = working.length; k < sets.length; k++) {
      const copy = structuredClone(last);
      copy.id = `${last.id}-added-${k}`;
      copy.checked = false;
      copy.actual = null;
      delete copy.effort;
      delete copy.removed;
      copy.prescribed = { ...copy.prescribed, reps: sets[k].reps, load: sets[k].load ?? copy.prescribed.load };
      ex.sets.push(copy);
    }
    touched++;
  });
  return touched ? { program: next, touched } : { program, touched: 0 };
}
