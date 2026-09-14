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

export type NewExerciseResult = { ok: true; exercise: LibraryExercise } | { ok: false; reason: string };

/** Checks a proposed addition before it is written for everybody.
 *
 * The muscle check is the one that matters. Every consumer of an exercise -- weekly volume, the soreness
 * check, the synergist table -- keys off the MUSCLE_GROUPS taxonomy, and a muscle outside it books the work
 * against nothing while looking completely normal on screen. The database carries the same constraint; this
 * is so the person gets told rather than seeing a raw Postgres error. */
export function validateNewExercise(name: string, muscle: string | null, existing: LibraryExercise[]): NewExerciseResult {
  const clean = name.trim();
  if (!clean) return { ok: false, reason: "Give the exercise a name." };
  if (!muscle) return { ok: false, reason: "Pick which muscle it trains." };
  if (!isKnownMuscle(muscle)) return { ok: false, reason: `"${muscle}" isn't one of the muscle groups.` };

  const clash = existing.find((e) => e.name.trim().toLowerCase() === clean.toLowerCase());
  if (clash) return { ok: false, reason: `${clash.name} is already in the library.` };

  return { ok: true, exercise: { id: customExerciseId(clean), name: clean, muscle, hasVideo: false } };
}
