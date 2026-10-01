/** Correcting a muscle the name matcher got wrong, once, in a program that already has it baked in.
 *
 * > *"The incline dumbbell row is a back exercise, not a chest exercise."*
 *
 * `guessMuscleFromLibrary("Incline Dumbbell Row")` returned **Chest**: the library had no incline row, so
 * the matcher scored it against "Incline Dumbbell Press" — two shared words out of four, the best score
 * available — and tagged a back exercise as chest. The muscle is copied onto the exercise when a program is
 * built, so the wrong answer is frozen into every week of every block built since.
 *
 * That tag is read by the soreness check, the pump check and the weekly volume counter, which is why Jack
 * was asked about chest on days he was rowing, and why I spent three rounds narrowing a soreness rule that
 * was reading this value and was right to.
 *
 * ## Only when the library is certain
 *
 * An `exact` or `subset` match — every word of one name appearing in the other. A `fuzzy` score is the
 * thing that caused this; it does not get to correct it. Same line `canonicalizeImportedName` already
 * draws for renaming: right often enough to pick a muscle, not right often enough to overwrite one behind
 * someone's back.
 *
 * ## Once, and it says so
 *
 * Stamped with `retagVersion`. A pass that kept running would overwrite a muscle someone set deliberately
 * every time they opened the app, which is the class of bug this file exists to clean up after.
 */
import type { Program } from "../data/types";
import { resolveLibraryExercise } from "../coach/exerciseLibrary";

/** Bump to re-run the correction after a matcher or library fix that changes answers. */
export const RETAG_VERSION = 1;

export interface Retag {
  exercise: string;
  from: string;
  to: string;
}

export function retagMisTaggedExercises(program: Program): { program: Program; retagged: Retag[] } {
  if ((program.retagVersion ?? 0) >= RETAG_VERSION) return { program, retagged: [] };

  const next = structuredClone(program);
  next.retagVersion = RETAG_VERSION;
  const retagged: Retag[] = [];
  const seen = new Set<string>();

  for (const week of next.weeks) {
    for (const day of week.days) {
      for (const ex of Object.values(day.exercises)) {
        const hit = resolveLibraryExercise(ex.name);
        if (!hit || hit.confidence === "fuzzy") continue;
        if (!hit.exercise.muscle || hit.exercise.muscle === ex.muscle) continue;
        const key = `${ex.name}:${ex.muscle}`;
        if (!seen.has(key)) {
          seen.add(key);
          retagged.push({ exercise: ex.name, from: ex.muscle, to: hit.exercise.muscle });
        }
        ex.muscle = hit.exercise.muscle;
      }
    }
  }

  return { program: next, retagged };
}
