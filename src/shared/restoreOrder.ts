/** Putting exercise order back to how the block was written, once.
 *
 * > *"Why the hell is all of my stuff out of order? If you look at what I did last week on the same day,
 * > the order should be exactly the same. There should be no changes in order on any exercises unless I
 * > moved them myself, or swapped in an exercise, or removed an exercise myself. This should never ever
 * > ever change."*
 *
 * `alignBlockShape` used to rewrite every later week of a session to match the order of the last COMPLETED
 * one. It is deleted — but deleting it cannot undo what it already wrote into a saved program, which is the
 * second time that has caught me out (see `strayCopies` for the first). This is the undo.
 *
 * ## What it restores to
 *
 * The EARLIEST occurrence of that session in the block — week 1 as written and trained. That is the one
 * week the old pass could never have rewritten: it only ever targeted sessions dated after its reference,
 * and nothing precedes the first.
 *
 * ## Why it runs exactly once
 *
 * Stamped on the program with `orderRepairVersion`. A pass that kept running would fight the user: a
 * reorder he makes in week 3 is his to keep, and a repair that re-ran every open would snap it back on the
 * next render. One correction of my own damage, then it never touches order again. Nothing else in the app
 * changes order automatically any more.
 *
 * ## What it will not touch
 *
 * A session that is done or already under way, and any exercise the reference week does not contain — one
 * he added later keeps its place at the end rather than vanishing. Membership is never changed here; this
 * only permutes keys the day already has.
 */
import type { Program, TrainingDay } from "../data/types";

/** Bump only to run a new one-time order repair. */
export const ORDER_REPAIR_VERSION = 1;

function started(day: TrainingDay): boolean {
  return Object.values(day.exercises).some((ex) => ex.sets.some((s) => s.checked));
}

function orderedKeys(day: TrainingDay): string[] {
  return day.order.length ? day.order : Object.keys(day.exercises);
}

/** Same session across weeks: same code AND same position in its week. Code alone merges genuinely
 * different days when a program carries repeated codes from an import. */
function sessionKey(program: Program, day: TrainingDay): string {
  for (const week of program.weeks) {
    const i = week.days.findIndex((d) => d.id === day.id);
    if (i >= 0) return `${day.code}#${i}`;
  }
  return `${day.code}#?`;
}

export function restoreProgrammedOrder(program: Program): { program: Program; restored: string[] } {
  if ((program.orderRepairVersion ?? 0) >= ORDER_REPAIR_VERSION) return { program, restored: [] };

  const next = structuredClone(program);
  next.orderRepairVersion = ORDER_REPAIR_VERSION;
  const restored: string[] = [];

  const bySession = new Map<string, TrainingDay[]>();
  for (const day of next.weeks.flatMap((w) => w.days)) {
    const key = sessionKey(next, day);
    bySession.set(key, [...(bySession.get(key) ?? []), day]);
  }

  for (const sessions of bySession.values()) {
    const sorted = [...sessions].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const reference = sorted[0];
    if (!reference || sorted.length < 2) continue;

    const rank = new Map<string, number>();
    orderedKeys(reference).forEach((key, i) => {
      const name = reference.exercises[key]?.name;
      if (name !== undefined && !rank.has(name)) rank.set(name, i);
    });
    if (rank.size === 0) continue;

    for (const day of sorted.slice(1)) {
      if (day.status === "done" || started(day)) continue;
      const before = orderedKeys(day).join("|");
      // Stable: an exercise the reference week does not have keeps its relative place, after the rest.
      // Only keys the day already holds are permuted -- nothing is created and nothing is dropped.
      day.order = orderedKeys(day)
        .map((key, i) => ({ key, i, at: rank.get(day.exercises[key]?.name ?? "") ?? Infinity }))
        .sort((a, b) => a.at - b.at || a.i - b.i)
        .map((x) => x.key);
      if (day.order.join("|") !== before) restored.push(day.id);
    }
  }

  return { program: next, restored };
}
