import type { Equipment, Program, TrainingDay, WorkExercise, WorkSet } from "../data/types";
import { defaultRestSec } from "../coach/rest";

/** Adding a movement to a session that is already running. Pure -- no Supabase import.
 *
 * Split out of the reducer for the reason this project keeps splitting things out: `store.tsx` creates the
 * Supabase client at import time, so a test that imports it throws before a single assertion runs. The same
 * wall put applyOverride in templateOverrideApply.ts. What lives here is the part worth pinning -- which
 * sessions an addition lands in -- because getting that wrong is silent. It books work into days the person
 * never agreed to change, or quietly edits history, and nothing crashes to say so. */

export interface AddedExercise {
  name: string;
  muscle: string;
  equipment: Equipment;
  hasVideo: boolean;
}

/** The sessions an addition should land in.
 *
 * `targetExercises` in the reducer cannot serve this: every other scoped edit resolves a key that already
 * exists somewhere in the program, and a new exercise exists nowhere yet. So the scope rule is necessarily
 * different, not carelessly different. A swap or a removal scopes by exercise NAME across every remaining
 * day, because a movement you have changed your mind about should change wherever it appears. An addition
 * has no occurrence to match on, so "mesocycle" means every remaining session of the SAME TYPE -- adding a
 * leg curl on a lower day must not put one into every push day.
 *
 * Two guards, both deliberate. A day already marked done is never touched, so history stays exactly as it
 * was trained. And "mesocycle" compares dates as well as codes, because status alone does not say it: a
 * session that was simply missed is not "done", and without the date check an addition would reach
 * backwards into a day that has already come and gone. */
export function addTargets(program: Program, dayId: string, scope: "day" | "mesocycle"): TrainingDay[] {
  let anchor: TrainingDay | null = null;
  for (const week of program.weeks) {
    const found = week.days.find((d) => d.id === dayId);
    if (found) {
      anchor = found;
      break;
    }
  }
  if (!anchor) return [];

  const out: TrainingDay[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      if (day.status === "done") continue;
      if (scope === "day") {
        if (day.id === dayId) out.push(day);
        continue;
      }
      if (day.code === anchor.code && day.date >= anchor.date) out.push(day);
    }
  }
  return out;
}

/** The program with the exercise added to every session the scope selects. Returns a new program; the one
 * passed in is not touched.
 *
 * `stamp` is injectable only so a test can assert on stable ids -- callers leave it alone. */
export function addExerciseToProgram(
  program: Program,
  dayId: string,
  exercise: AddedExercise,
  scope: "day" | "mesocycle",
  stamp: number = Date.now(),
): Program {
  const next = structuredClone(program);

  for (const day of addTargets(next, dayId, scope)) {
    const id = `${day.id}-add-${stamp}`;
    // 3 x 10 at load 0 is exactly what buildProgramFromDraft falls back to, so an exercise added here and
    // one drawn from a draft arrive identical rather than subtly different. The effort literal is what that
    // file's effortForLoadMode returns for a plain-lb set; it is private to that module, hence the copy.
    const sets: WorkSet[] = Array.from({ length: 3 }, (_, i) => ({
      id: `${id}-s${i + 1}`,
      index: i + 1,
      type: "straight",
      prescribed: { reps: 10, load: 0, effort: { scale: "RIR", value: 2 }, restSec: defaultRestSec(exercise.name) },
      actual: null,
      checked: false,
    }));

    // Read before the insert: order falls back to the keys of `exercises`, and reading it afterwards would
    // already list the new id and then append it a second time.
    const baseOrder = day.order.length ? [...day.order] : Object.keys(day.exercises);
    const added: WorkExercise = {
      id,
      name: exercise.name,
      muscle: exercise.muscle,
      loadMode: "lb",
      metaLine: `${sets.length} sets`,
      hasVideo: exercise.hasVideo,
      equipment: exercise.equipment,
      sets,
    };
    day.exercises[id] = added;
    day.order = [...baseOrder, id];
    day.setCount = Object.values(day.exercises).reduce((n, ex) => n + ex.sets.length, 0);
    // Recomputed, where REMOVE_EXERCISE leaves it alone: a muscle not trained on this day before genuinely
    // belongs in the summary, or the header contradicts the card sitting directly under it.
    const muscles = new Set(Object.values(day.exercises).map((ex) => ex.muscle.toLowerCase()));
    day.muscleSummary = Array.from(muscles).slice(0, 4).join(", ");
  }

  return next;
}
