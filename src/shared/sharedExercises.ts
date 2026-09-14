import { supabase } from "../lib/supabase";
import type { LibraryExercise } from "../coach/types";

export { customExerciseId, isKnownMuscle, mergeExercises, validateNewExercise } from "./sharedExerciseList";
export type { NewExerciseResult } from "./sharedExerciseList";

/** Reading and writing the exercises that get added to everybody's library (migration 0030).
 *
 * The pure half -- how an addition merges with the shipped library, and what counts as a valid one -- lives
 * in sharedExerciseList.ts, because this file creates the Supabase client at import time and therefore
 * cannot be imported by a test.
 *
 * **The read fails soft.** 0030 is applied by hand like every migration here, and this project has been
 * bitten before by code that assumed one was live: 0002 sat committed and unrun for months while
 * get_coach_templates silently returned []. A missing table, a network failure or an unapplied policy all
 * resolve to "no additions", and every picker shows exactly the library it shows today. It cannot empty an
 * exercise list by being absent. */

export async function fetchSharedExercises(): Promise<LibraryExercise[]> {
  try {
    const { data, error } = await supabase.from("library_exercises").select("id, name, muscle, kind");
    if (error || !data) return [];
    return (data as { id: string; name: string; muscle: string; kind: string | null }[]).map((row) => ({
      id: row.id,
      name: row.name,
      muscle: row.muscle,
      hasVideo: false,
      ...(row.kind === "cardio" ? { kind: "cardio" as const } : {}),
    }));
  } catch {
    return [];
  }
}

/** Add one exercise for every account. Only the platform admin's write passes 0030's policy; for anyone
 * else the database refuses it, which is the real gate -- hiding the control is not access control. */
export async function addSharedExercise(exercise: LibraryExercise): Promise<void> {
  const { error } = await supabase.from("library_exercises").insert({
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    kind: exercise.kind ?? "strength",
  });
  if (error) throw new Error(error.message);
}
