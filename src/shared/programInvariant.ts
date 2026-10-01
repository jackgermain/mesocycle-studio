/** The invariant: an automatic write may change NUMBERS, never which exercises a session holds or the order
 * they are in.
 *
 * > *"There should be no changes in order on any exercises unless I moved them myself, or swapped in an
 * > exercise, or removed an exercise myself. This should never ever ever change. Run an audit on the system
 * > to make sure that this never happens again."*
 *
 * The audit found fifteen code paths that write to a program with no user action behind them. Most are
 * fine — a progression writing next week's weights is exactly what auto programming is for. What none of
 * them may do is touch SHAPE, and nothing was enforcing that. Every order regression so far arrived through
 * a reducer case that took a whole replacement `Program` and trusted it:
 *
 *   `case "SET_PROGRAM": return { ...state, program: action.program };`
 *
 * So the guard goes at the reducer, not at the callers. A caller can be careful; the next one written in six
 * months will not know it has to be. `keepShape` takes the program as it was and the program a background
 * pass wants to install, and returns one with the new numbers and the OLD shape — same exercises, same
 * order, per day. A pass that tries to reorder or add or drop silently has that part of its work discarded.
 *
 * Days absent from the previous program (a block being extended, a newly built program) pass through
 * untouched: there is no previous shape to keep.
 */
import type { Program, TrainingDay } from "../data/types";

function orderedKeys(day: TrainingDay): string[] {
  return day.order.length ? day.order : Object.keys(day.exercises);
}

export interface ShapeDiff {
  dayId: string;
  reordered: boolean;
  added: string[];
  removed: string[];
}

/** `next` with every day's exercise membership and order forced back to `previous`. Also reports what it
 * had to undo, so a caller can log it rather than discovering it on a phone a week later. */
export function keepShape(previous: Program, next: Program): { program: Program; undone: ShapeDiff[] } {
  const before = new Map<string, TrainingDay>();
  for (const week of previous.weeks) for (const day of week.days) before.set(day.id, day);

  const undone: ShapeDiff[] = [];
  const program = structuredClone(next);

  for (const week of program.weeks) {
    for (const day of week.days) {
      const was = before.get(day.id);
      if (!was) continue; // a week that did not exist before -- nothing to preserve

      const wasKeys = orderedKeys(was);
      const nowKeys = orderedKeys(day);
      const wasNames = wasKeys.map((k) => was.exercises[k]?.name).filter(Boolean) as string[];
      const nowNames = nowKeys.map((k) => day.exercises[k]?.name).filter(Boolean) as string[];

      const added = nowNames.filter((n) => !wasNames.includes(n));
      const removed = wasNames.filter((n) => !nowNames.includes(n));
      const reordered = added.length === 0 && removed.length === 0 && wasNames.join("|") !== nowNames.join("|");
      if (!reordered && added.length === 0 && removed.length === 0) continue;

      // Put the shape back. Exercises the pass invented are dropped; ones it deleted are restored from the
      // previous program, carrying their prescription rather than anything the pass may have written.
      for (const name of added) {
        const key = nowKeys.find((k) => day.exercises[k]?.name === name);
        if (key) delete day.exercises[key];
      }
      for (const key of wasKeys) {
        if (!day.exercises[key]) day.exercises[key] = structuredClone(was.exercises[key]);
      }
      day.order = wasKeys.filter((k) => day.exercises[k]);
      day.setCount = Object.values(day.exercises).reduce((n, e) => n + e.sets.length, 0);

      undone.push({ dayId: day.id, reordered, added, removed });
    }
  }

  return undone.length ? { program, undone } : { program: next, undone };
}
