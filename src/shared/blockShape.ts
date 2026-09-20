/** Later weeks of a session carry the same exercises, in the same order, as the way it was actually trained.
 *
 * > *"You're literally copy-pasting it from last week to this week, with the addition of exercises that may
 * > or may not have been removed, and change the numbers on it. That's it. Nothing else."*
 *
 * The numbers half of that is `applyProgressionToProgram`. This is the shape half, and it was missing —
 * which is why Hip Clean sat first in week 1 and last in week 2 of the same session. Fixing
 * `REORDER_EXERCISES` to carry forward (see reorderDay.ts) stops it happening again but cannot repair a
 * block where it already has.
 *
 * **Idempotent, so it can run on every open.** Aligning an already-aligned week changes nothing, which is
 * what makes it safe to run as a pass rather than once per session — unlike a progression, which must apply
 * exactly once or it compounds.
 *
 * **Additive only.** An exercise the reference has and a later week lacks is added; an exercise a later week
 * has and the reference lacks is left alone. Removing a movement is a decision with its own action and its
 * own scope choice (`REMOVE_EXERCISE`), and guessing at it from a shape difference would delete work nobody
 * asked to lose.
 *
 * **The reference is the most recently COMPLETED session of that code**, not the first and not one merely
 * under way. What he actually trained last week is the split, including any change he made on the day — but
 * a session still in progress has established nothing yet, and it is the likeliest one to be carrying the
 * stale order this exists to repair. Letting it be the reference would propagate the bug forward instead.
 */
import type { Program, TrainingDay, WorkExercise } from "../data/types";

function started(day: TrainingDay): boolean {
  return Object.values(day.exercises).some((ex) => ex.sets.some((s) => s.checked));
}

function orderedKeys(day: TrainingDay): string[] {
  return day.order.length ? day.order : Object.keys(day.exercises);
}

/** A fresh copy of an exercise for a week that has not happened: the prescription, none of the history. */
function blankCopy(ex: WorkExercise, dayId: string): WorkExercise {
  const copy = structuredClone(ex);
  copy.id = `${dayId}-${ex.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  copy.sets = copy.sets
    .filter((s) => !s.removed)
    .map((s, i) => ({
      ...s,
      id: `${copy.id}-s${i + 1}`,
      checked: false,
      actual: null,
      effort: undefined,
      removed: undefined,
      lastWeek: undefined,
    }));
  return copy;
}

export function alignBlockShape(program: Program): { program: Program; changed: string[] } {
  const next = structuredClone(program);
  const days = next.weeks.flatMap((w) => w.days);
  const changed: string[] = [];

  const byCode = new Map<string, TrainingDay[]>();
  for (const d of days) byCode.set(d.code, [...(byCode.get(d.code) ?? []), d]);

  for (const sessions of byCode.values()) {
    const sorted = [...sessions].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const complete = sorted.filter((d) => d.status === "done");
    const reference = complete[complete.length - 1];
    // Nothing has been completed yet, so the generated shape is the only shape there is.
    if (!reference) continue;

    const rank = new Map<string, number>();
    orderedKeys(reference).forEach((key, i) => {
      const name = reference.exercises[key]?.name;
      if (name !== undefined && !rank.has(name)) rank.set(name, i);
    });
    if (rank.size === 0) continue;

    for (const day of sorted) {
      if (day.date <= reference.date || day.status === "done" || started(day)) continue;
      const before = orderedKeys(day).map((k) => day.exercises[k]?.name).join("|");

      // Anything trained last week that this week does not have yet.
      const have = new Set(Object.values(day.exercises).map((e) => e.name));
      for (const key of orderedKeys(reference)) {
        const ex = reference.exercises[key];
        if (!ex || have.has(ex.name)) continue;
        const copy = blankCopy(ex, day.id);
        day.exercises[copy.id] = copy;
        day.order = [...orderedKeys(day), copy.id];
      }

      // Then the order itself. Stable, so anything the reference does not mention keeps its relative place
      // at the end rather than being shuffled arbitrarily.
      day.order = orderedKeys(day)
        .map((key, i) => ({ key, i, at: rank.get(day.exercises[key]?.name ?? "") ?? Infinity }))
        .sort((a, b) => a.at - b.at || a.i - b.i)
        .map((x) => x.key);
      day.setCount = Object.values(day.exercises).reduce((n, ex) => n + ex.sets.length, 0);

      if (orderedKeys(day).map((k) => day.exercises[k]?.name).join("|") !== before) changed.push(day.id);
    }
  }

  return changed.length ? { program: next, changed } : { program, changed };
}
