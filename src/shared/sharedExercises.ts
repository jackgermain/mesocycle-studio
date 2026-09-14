import { supabase } from "../lib/supabase";
import type { LibraryExercise } from "../coach/types";

export { customExerciseId, isKnownMuscle, mergeExercises, musclesOf, trainsMuscle, validateNewExercise } from "./sharedExerciseList";
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
 * exercise list by being absent.
 *
 * `secondary_muscles` (0032) is selected separately from that guarantee on purpose -- see fetchSharedExercises. */

export async function fetchSharedExercises(): Promise<LibraryExercise[]> {
  const map = (rows: { id: string; name: string; muscle: string; kind: string | null; secondary_muscles?: string[] | null }[]): LibraryExercise[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      muscle: row.muscle,
      ...(row.secondary_muscles?.length ? { secondaryMuscles: row.secondary_muscles } : {}),
      hasVideo: false,
      ...(row.kind === "cardio" ? { kind: "cardio" as const } : {}),
    }));

  try {
    const { data, error } = await supabase.from("library_exercises").select("id, name, muscle, kind, secondary_muscles");
    if (!error && data) return map(data as Parameters<typeof map>[0]);

    // 0032 adds secondary_muscles, and 0030 shipped without it. Selecting a column that does not exist
    // fails the WHOLE query, which would hide every shared exercise until the migration is applied -- the
    // exact "assumed a migration was live" trap this file's header is about. So fall back to the 0030
    // columns rather than returning nothing, and let the extra muscles appear once 0032 lands.
    const legacy = await supabase.from("library_exercises").select("id, name, muscle, kind");
    if (legacy.error || !legacy.data) return [];
    return map(legacy.data as Parameters<typeof map>[0]);
  } catch {
    return [];
  }
}

/** Add one exercise for every account. 0031 lets any active coach or General account insert; update and
 * delete stay with the platform admin. The database is the real gate -- hiding a control is not access
 * control. */
export async function addSharedExercise(exercise: LibraryExercise): Promise<void> {
  const row = {
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    kind: exercise.kind ?? "strength",
    secondary_muscles: exercise.secondaryMuscles ?? [],
  };
  const { error } = await supabase.from("library_exercises").insert(row);
  if (!error) return;

  // Same reason as the read: before 0032 the column is not there, and the whole insert is rejected rather
  // than the one field ignored. Retry without it so adding an exercise still works, minus the extra muscles.
  if (/secondary_muscles/.test(error.message)) {
    const { secondary_muscles: _dropped, ...withoutSecondary } = row;
    const retry = await supabase.from("library_exercises").insert(withoutSecondary);
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  throw new Error(error.message);
}
