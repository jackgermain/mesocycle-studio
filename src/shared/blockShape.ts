/** Deleting exercises a bug of mine wrote into sessions they never belonged in.
 *
 * This file used to also hold `alignBlockShape`, which rewrote every later week of a session to match the
 * order of the last COMPLETED one. It was a repair for blocks already scrambled by the old single-week
 * reorder bug, and it caused a worse problem than it fixed: the Reorder screen is ALSO the in-session
 * "station busy" control, so one shuffle while training week 2 silently became the order for the rest of
 * the block. Jack, on week 3 day 3: *"You completely changed the order of all my exercises week over week.
 * I never asked you to do anything like that ever within a block."*
 *
 * Nothing automatic changes exercise order now. It changes when he changes it, and a deliberate reorder
 * carries forward from reorderDay.ts.
 */
import type { Program } from "../data/types";

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
