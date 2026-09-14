import { test } from "node:test";
import assert from "node:assert/strict";
// The pure module, deliberately. sharedExercises.ts creates the Supabase client at import time and
// lib/supabase.ts reads import.meta.env, which is undefined here -- importing it throws before any
// assertion runs.
import { customExerciseId, mergeExercises, validateNewExercise } from "../src/shared/sharedExerciseList";
import { libraryExercises } from "../src/coach/exerciseLibrary";
import type { LibraryExercise } from "../src/coach/types";

/** Exercises added to every account's library (migration 0030).
 *
 * Jack searched the picker for "Hip Clean", got nothing, and asked for a way to add one that "saves across
 * all accounts". So this logic decides what every signed-in account's exercise list contains, which makes
 * it worth pinning.
 *
 * The muscle check is the load-bearing one. Weekly volume, the soreness check and the synergist table all
 * key off the MUSCLE_GROUPS taxonomy; an exercise carrying anything outside it books its work against
 * nothing while looking entirely normal on screen. That is the same silent failure that turned "Deadlifts"
 * into a Romanian deadlift with nobody noticing. */

const ex = (name: string, muscle = "Quads"): LibraryExercise => ({ id: customExerciseId(name), name, muscle, hasVideo: false });

test("an addition shows up alongside the shipped library", () => {
  const merged = mergeExercises(libraryExercises, [ex("Hip Clean", "Full body")]);
  assert.equal(merged.length, libraryExercises.length + 1);
  assert.ok(merged.some((e) => e.name === "Hip Clean"));
});

test("the shipped library keeps its order, and additions follow it", () => {
  // Otherwise a search result reshuffles under the finger as the remote list arrives.
  const merged = mergeExercises(libraryExercises, [ex("Hip Clean", "Full body")]);
  assert.deepEqual(merged.slice(0, libraryExercises.length).map((e) => e.id), libraryExercises.map((e) => e.id));
  assert.equal(merged[merged.length - 1].name, "Hip Clean");
});

test("a shared row cannot shadow or duplicate a shipped exercise", () => {
  const shipped = libraryExercises[0];
  const merged = mergeExercises(libraryExercises, [ex(shipped.name, shipped.muscle)]);
  assert.equal(merged.length, libraryExercises.length, "the shipped one wins, nothing is appended");
  assert.equal(merged.filter((e) => e.name === shipped.name).length, 1);
});

test("deduping is case-insensitive, because the name is what a person reads", () => {
  const shipped = libraryExercises[0];
  const merged = mergeExercises(libraryExercises, [ex(shipped.name.toUpperCase(), shipped.muscle)]);
  assert.equal(merged.length, libraryExercises.length);
});

test("two additions that differ only in capitalisation collapse to one", () => {
  const merged = mergeExercises([], [ex("Hip Clean", "Full body"), ex("hip clean", "Full body")]);
  assert.equal(merged.length, 1);
});

test("the id is derived from the name, so adding the same thing twice collides rather than duplicating", () => {
  assert.equal(customExerciseId("Hip Clean"), "cx-hip-clean");
  assert.equal(customExerciseId("  Hip   Clean  "), customExerciseId("Hip Clean"));
  assert.ok(!customExerciseId("Hip Clean").startsWith("lib-"), "must not collide with built-in positional ids");
});

test("a muscle outside the taxonomy is refused", () => {
  // The whole reason the column is constrained: this one fails silently everywhere downstream.
  const out = validateNewExercise("Hip Clean", "Hip Flexors", []);
  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.reason : "", /muscle groups/);
});

test("a blank name, or no muscle picked, is refused with something readable", () => {
  for (const name of ["", "   "]) {
    const out = validateNewExercise(name, "Quads", []);
    assert.equal(out.ok, false, `"${name}" should not be accepted`);
  }
  assert.equal(validateNewExercise("Hip Clean", null, []).ok, false);
});

test("adding a name the library already has is refused, whatever the casing", () => {
  const out = validateNewExercise(libraryExercises[0].name.toLowerCase(), "Quads", libraryExercises);
  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.reason : "", /already in the library/);
});

test("a valid addition comes back trimmed, with a derived id and a real muscle", () => {
  const out = validateNewExercise("  Hip Clean  ", "Full body", libraryExercises);
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.exercise.name, "Hip Clean", "stored trimmed, or it dedupes against itself later");
  assert.equal(out.exercise.id, "cx-hip-clean");
  assert.equal(out.exercise.muscle, "Full body");
});
