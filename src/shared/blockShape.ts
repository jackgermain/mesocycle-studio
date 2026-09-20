/** Later weeks of a session carry the same exercises in the same ORDER as the way it was actually trained.
 *
 * > *"You're literally copy-pasting it from last week to this week, with the addition of exercises that may
 * > or may not have been removed, and change the numbers on it. That's it. Nothing else."*
 *
 * The numbers half of that is `applyProgressionToProgram`. This is the order half, and it was missing —
 * which is why Hip Clean sat first in week 1 and last in week 2 of the same session. Fixing
 * `REORDER_EXERCISES` to carry forward (see reorderDay.ts) stops it recurring but repairs nothing already
 * in that state.
 *
 * ## It reorders. It does not add.
 *
 * The first version also copied any exercise the reference had and a later week lacked. That put a **seated
 * dumbbell curl onto a leg day** in Jack's own block, and he found it within minutes of the deploy. Whether
 * the source was a repeated day `code` in an imported program or a movement sitting in week 1 he did not
 * expect to travel, the lesson is the same: a rule that can invent an exercise on a session gets it wrong
 * in a way that is obvious to a lifter within seconds and invisible to a test suite written around the
 * happy path.
 *
 * So this only ever permutes keys **already in that day**. It cannot add, remove, rename or substitute
 * anything. A much smaller promise, and the whole of what was actually reported.
 *
 * `strayCopies` cleans up what the additive version wrote before it was pulled.
 *
 * ## Idempotent, so it runs on every open
 *
 * Aligning an aligned week changes nothing and returns the same object, which is what makes a pass safe
 * where a progression would compound.
 *
 * ## The reference is the most recently COMPLETED session
 *
 * Not the first, and not one merely under way: a session in progress has established nothing yet, and is
 * the likeliest one to be carrying the stale order this exists to repair.
 */
import type { Program, TrainingDay } from "../data/types";

function started(day: TrainingDay): boolean {
  return Object.values(day.exercises).some((ex) => ex.sets.some((s) => s.checked));
}

function orderedKeys(day: TrainingDay): string[] {
  return day.order.length ? day.order : Object.keys(day.exercises);
}

/** Two sessions are the same session when they share a code AND a position in their week.
 *
 * The code alone was not enough. `programConvert` numbers days `D1`, `D2`… per slot, so codes are unique
 * within a week there — but `appendWeeks` copies whatever code a day already had, and an imported program
 * carries codes from someone else's spreadsheet. A repeated code silently merges two genuinely different
 * sessions, and merging a leg day with an arm day is exactly how a curl reaches a squat session. */
function sessionKey(program: Program, day: TrainingDay): string {
  for (const week of program.weeks) {
    const i = week.days.findIndex((d) => d.id === day.id);
    if (i >= 0) return `${day.code}#${i}`;
  }
  return `${day.code}#?`;
}

export function alignBlockShape(program: Program): { program: Program; changed: string[] } {
  const next = structuredClone(program);
  const days = next.weeks.flatMap((w) => w.days);
  const changed: string[] = [];

  const bySession = new Map<string, TrainingDay[]>();
  for (const d of days) {
    const key = sessionKey(next, d);
    bySession.set(key, [...(bySession.get(key) ?? []), d]);
  }

  for (const sessions of bySession.values()) {
    const sorted = [...sessions].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const complete = sorted.filter((d) => d.status === "done");
    const reference = complete[complete.length - 1];
    // Nothing completed yet, so the generated order is the only order there is.
    if (!reference) continue;

    const rank = new Map<string, number>();
    orderedKeys(reference).forEach((key, i) => {
      const name = reference.exercises[key]?.name;
      if (name !== undefined && !rank.has(name)) rank.set(name, i);
    });
    if (rank.size === 0) continue;

    for (const day of sorted) {
      if (day.date <= reference.date || day.status === "done" || started(day)) continue;
      const before = orderedKeys(day).join("|");
      // Stable: anything the reference does not mention keeps its relative place, after the rest. Only the
      // day's own keys are permuted -- nothing is created and nothing is dropped.
      day.order = orderedKeys(day)
        .map((key, i) => ({ key, i, at: rank.get(day.exercises[key]?.name ?? "") ?? Infinity }))
        .sort((a, b) => a.at - b.at || a.i - b.i)
        .map((x) => x.key);
      if (day.order.join("|") !== before) changed.push(day.id);
    }
  }

  return changed.length ? { program: next, changed } : { program, changed };
}

/** Undoes the additive version of the rule above, which shipped briefly and wrote exercises into sessions
 * they did not belong in.
 *
 * Identifiable exactly: it keyed every copy `<dayId>-<name slugified>`, a shape nothing else in the app
 * produces — builder ids look like `w2-d1-e3`. Only ever removes an untouched copy, so a set someone has
 * actually logged against one is never thrown away. */
export function strayCopies(program: Program): { program: Program; removed: string[] } {
  const next = structuredClone(program);
  const removed: string[] = [];
  for (const week of next.weeks) {
    for (const day of week.days) {
      for (const [key, ex] of Object.entries(day.exercises)) {
        const slug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (key !== `${day.id}-${slug}`) continue;
        if (ex.sets.some((s) => s.checked)) continue;
        delete day.exercises[key];
        day.order = day.order.filter((id) => id !== key);
        day.setCount = Object.values(day.exercises).reduce((n, e) => n + e.sets.length, 0);
        removed.push(`${day.id}:${ex.name}`);
      }
    }
  }
  return removed.length ? { program: next, removed } : { program, removed };
}
