import type { LibraryExercise } from "../coach/types";
import { MUSCLE_GROUPS } from "../coach/exerciseLibrary";

/** How a shared library addition (migration 0030) joins the exercises that ship in the bundle. Pure -- no
 * Supabase import.
 *
 * Split from sharedExercises.ts for the reason this project keeps splitting things out: that module creates
 * the Supabase client at import time and `lib/supabase.ts` reads `import.meta.env`, which is undefined under
 * the Node test runner, so importing it from a test throws before the first assertion. The same wall put
 * applyOverride in templateOverrideApply.ts and addExerciseToProgram in addExercise.ts.
 *
 * What lives here is worth pinning: this decides what every account's exercise picker contains. */

/** A stable id derived from the name, the same shape buildTemplate uses for templates.
 *
 * Derived rather than random so the same name always produces the same id -- adding "Hip Clean" twice is
 * then a primary-key conflict the database refuses, instead of two rows that render as two identical
 * entries. The `cx-` prefix keeps these clear of the built-in `lib-N` ids, which are positional. */
export function customExerciseId(name: string): string {
  return `cx-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function isKnownMuscle(muscle: string): boolean {
  return (MUSCLE_GROUPS as readonly string[]).includes(muscle);
}

/** The shipped library plus the shared additions, with the shipped one winning any clash.
 *
 * Deduped case-insensitively by name rather than by id, because the name is what a person reads: two rows
 * called "Hip Clean" and "hip clean" are one movement however different their ids are. The built-in list
 * keeps its order and additions follow, so a search result never reshuffles as the remote list loads in. */
export function mergeExercises(builtIn: LibraryExercise[], shared: LibraryExercise[]): LibraryExercise[] {
  const seen = new Set(builtIn.map((e) => e.name.trim().toLowerCase()));
  const out = [...builtIn];
  for (const e of shared) {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** Every muscle an exercise trains, primary first. The one place that answers "what does this work", so a
 * caller never has to remember to look at both fields. */
export function musclesOf(exercise: Pick<LibraryExercise, "muscle" | "secondaryMuscles">): string[] {
  return [exercise.muscle, ...(exercise.secondaryMuscles ?? [])];
}

/** True when the exercise trains this muscle at all, primary or otherwise -- what a muscle FILTER should
 * ask. Filtering on the primary alone hides a hip clean from the Traps filter even though it was tagged
 * with traps, which makes the tagging pointless. */
export function trainsMuscle(exercise: Pick<LibraryExercise, "muscle" | "secondaryMuscles">, muscle: string): boolean {
  return musclesOf(exercise).includes(muscle);
}

export type NewExerciseResult = { ok: true; exercise: LibraryExercise } | { ok: false; reason: string };

/** Checks a proposed addition before it is written for everybody.
 *
 * `muscles` is ordered and the FIRST is the primary -- the one a set is actually booked against. The rest
 * become secondaryMuscles and earn fractional credit only. That ordering is the whole contract: the picker
 * records the order they were tapped in, so "first tapped is the main one" is a rule a person can see the
 * result of rather than a hidden default.
 *
 * The taxonomy check is the one that matters. Every consumer of an exercise -- weekly volume, the soreness
 * check, the synergist table -- keys off MUSCLE_GROUPS, and a muscle outside it books the work against
 * nothing while looking completely normal on screen. The database carries the same constraint; this is so
 * the person gets told rather than seeing a raw Postgres error. */
export function validateNewExercise(name: string, muscles: string[], existing: LibraryExercise[]): NewExerciseResult {
  const clean = name.trim();
  if (!clean) return { ok: false, reason: "Give the exercise a name." };
  if (!muscles.length) return { ok: false, reason: "Pick at least one muscle it trains." };

  // Deduped in place so the order the person tapped still decides the primary.
  const picked = muscles.filter((m, i) => muscles.indexOf(m) === i);
  const unknown = picked.find((m) => !isKnownMuscle(m));
  if (unknown) return { ok: false, reason: `"${unknown}" isn't one of the muscle groups.` };

  const clash = existing.find((e) => e.name.trim().toLowerCase() === clean.toLowerCase());
  if (clash) return { ok: false, reason: `${clash.name} is already in the library.` };

  const [primary, ...secondary] = picked;
  return {
    ok: true,
    exercise: {
      id: customExerciseId(clean),
      name: clean,
      muscle: primary,
      ...(secondary.length ? { secondaryMuscles: secondary } : {}),
      hasVideo: false,
    },
  };
}
