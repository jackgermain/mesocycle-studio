/** Which how-hard ratings a session still owes. No Supabase import, so a test can reach it.
 *
 * The rating used to be asked only at the moment the last set was ticked, from component state. Anything
 * that ticked a set another way never asked: a cluster, tempo or assisted set is logged on the live-set
 * screen, which has no prompt. And a question lost to navigating away was never asked again, because a
 * ticked set is not ticked twice. Deriving what is owed from the logged sets themselves closes both: the
 * question stays up until the answer is stored, however the set got ticked. */
import type { TrainingDay, WorkExercise, WorkSet } from "../data/types";

function workingSets(ex: WorkExercise): WorkSet[] {
  return ex.sets.filter((s) => !s.isWarmup && !s.removed);
}

/** The exercise's last working set, once it is ticked and until it is rated (G62: last set only). */
export function effortOwedSet(ex: WorkExercise): WorkSet | null {
  const working = workingSets(ex);
  const last = working[working.length - 1];
  if (!last || !last.checked || last.effort !== undefined) return null;
  return last;
}

/** When a session is ended early, an exercise that was started but never reached its last set still owes
 * one rating -- on the last set actually done, which is the best answer to "how hard was it" there is.
 * An exercise with nothing ticked owes nothing. */
export function effortOwedOnEarlyEnd(ex: WorkExercise): WorkSet | null {
  const final = effortOwedSet(ex);
  if (final) return final;
  const working = workingSets(ex);
  if (working.length === 0 || working[working.length - 1].checked) return null;
  const done = working.filter((s) => s.checked);
  if (done.length === 0 || done.some((s) => s.effort !== undefined)) return null;
  return done[done.length - 1];
}

export interface OwedRating {
  exerciseId: string;
  setId: string;
}

/** Every rating a day owes, in session order. `early` covers ending a session with sets left undone. */
export function effortOwedForDay(day: TrainingDay, early = false): OwedRating[] {
  const ids = day.order.length ? day.order : Object.keys(day.exercises);
  const out: OwedRating[] = [];
  for (const id of ids) {
    const ex = day.exercises[id];
    if (!ex) continue;
    const set = early ? effortOwedOnEarlyEnd(ex) : effortOwedSet(ex);
    if (set) out.push({ exerciseId: id, setId: set.id });
  }
  return out;
}
