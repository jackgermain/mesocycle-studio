/** The name matcher, which decides what an imported exercise IS.
 *
 * Everything downstream is keyed on the answer: the muscle a set is booked against, the soreness check,
 * and (once the generator is wired in) every rule attached to a library entry. A silent regression here
 * doesn't crash -- it books chest volume as back volume, or renames a coach's exercise to the wrong
 * movement, and nobody notices for weeks. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLibraryExercise,
  guessMuscleFromLibrary,
  canonicalizeImportedName,
  normalizeExerciseName,
  libraryExercises,
  MUSCLE_GROUPS,
} from "../src/coach/exerciseLibrary.ts";

test("every library entry resolves to itself, exactly", () => {
  for (const ex of libraryExercises) {
    const hit = resolveLibraryExercise(ex.name);
    assert.ok(hit, `${ex.name} resolved to nothing`);
    assert.equal(hit.exercise.muscle, ex.muscle, `${ex.name} resolved to the wrong muscle`);
    assert.notEqual(hit.confidence, "fuzzy", `${ex.name} should not need a fuzzy match against itself`);
  }
});

test("every library muscle is one of the declared groups", () => {
  for (const ex of libraryExercises) {
    assert.ok(MUSCLE_GROUPS.includes(ex.muscle as never), `${ex.name} has muscle "${ex.muscle}", not in MUSCLE_GROUPS`);
  }
});

test("library names are unique", () => {
  const seen = new Set<string>();
  for (const ex of libraryExercises) {
    assert.ok(!seen.has(ex.name), `duplicate library entry: ${ex.name}`);
    seen.add(ex.name);
  }
});

/** A bare movement name must not pick up a qualifier that changes the movement.
 *
 * Jack: "deadlifts are not the same thing as romanian deadlifts." Plain "Deadlifts" is a subset of both
 * "Barbell Deadlift" and "Romanian Deadlift" at one matched token each, so the answer came down to the
 * tie-break -- and the old one preferred the entry with fewer EQUIPMENT words, which handed it to Romanian
 * (0 generic) over Barbell (1). Backwards: "barbell" only names the bar it is held with, while "Romanian"
 * is a different movement, a different muscle (Hamstrings, not Back) and different volume.
 *
 * These are worth pinning because the failure is silent. Nothing crashes; a conventional deadlift simply
 * books hamstring volume for months. The same matcher has now done this three times -- "Deadlifts", "Trap
 * Bar Deadlift", and a cable chop that came back as a chest fly. */

test("a plain deadlift is the conventional one, not a Romanian", () => {
  for (const written of ["Deadlifts", "Deadlift", "deadlift"]) {
    const hit = resolveLibraryExercise(written);
    assert.equal(hit?.exercise.name, "Barbell Deadlift", `"${written}"`);
    assert.equal(hit?.exercise.muscle, "Back", `"${written}" must book back volume, not hamstrings`);
  }
});

test("a written RDL still resolves to the Romanian deadlift", () => {
  // The guard on the fix above. Here both candidates add nothing the input did not already say, and the
  // entry carrying fewer equipment words really is the movement being named -- so the older tie-break has
  // to survive as the tertiary rule. Fixing the case above by simply inverting it would break this one.
  for (const written of ["Barbell RDL", "RDL", "Romanian Deadlifts"]) {
    assert.equal(resolveLibraryExercise(written)?.exercise.name, "Romanian Deadlift", `"${written}"`);
    assert.equal(guessMuscleFromLibrary(written), "Hamstrings", `"${written}"`);
  }
});

test("a trap bar deadlift is a deadlift, not a shrug", () => {
  // It fuzzy-matched "Trap Bar Shrug" on the shared words "trap" and "bar", booking a heavy hinge as trap
  // volume -- the worst of the three, because the muscle and the movement were both wrong.
  const hit = resolveLibraryExercise("Trap Bar Deadlift");
  assert.equal(hit?.exercise.name, "Trap Bar Deadlift");
  assert.equal(hit?.exercise.muscle, "Back");
});

test("a bare name prefers the entry that only adds equipment", () => {
  // The general rule under all three cases: an entry adding just the implement beats one adding a
  // different movement. "Shrugs" takes Barbell Shrug over Trap Bar Shrug for exactly that reason.
  assert.equal(resolveLibraryExercise("Shrugs")?.exercise.name, "Barbell Shrug");
});

test("abbreviations resolve to the right movement", () => {
  const cases: [string, string][] = [
    ["DB Inc Press", "Incline Dumbbell Press"],   // "inc" -- resolved to a FLAT press before this was added
    ["Incline DB Press", "Incline Dumbbell Press"],
    ["BB RDL", "Romanian Deadlift"],              // must beat "Barbell Deadlift" on the tie-break
    ["Barbell RDL", "Romanian Deadlift"],
    ["Smith Squat", "Smith Machine Squat"],
    ["Alt DB Curl", "Alternating Dumbbell Curl"],
    ["1arm row", "Single-Arm Dumbbell Row"],
    ["KB Swing", "Kettlebell Swing"],
  ];
  for (const [written, expected] of cases) {
    assert.equal(resolveLibraryExercise(written)?.exercise.name, expected, `"${written}"`);
  }
});

test("plurals, hyphens and run-together words are the same exercise", () => {
  for (const [a, b] of [["Cable Curls", "Cable Curl"], ["PullUps", "Pull-Up"], ["Chin Ups", "Chin-Up"],
                        ["chest-supported rows", "Chest Supported Row"], ["Hammer Curls", "Hammer Curl"]]) {
    assert.equal(guessMuscleFromLibrary(a), guessMuscleFromLibrary(b), `"${a}" vs "${b}"`);
  }
});

test("two written words join into the library's one word", () => {
  // "lat pull down" tokenises to three words and never meets "pulldown" without the string-level pass.
  assert.equal(guessMuscleFromLibrary("lat pull down"), "Back");
  assert.equal(guessMuscleFromLibrary("rope push down"), guessMuscleFromLibrary("rope pushdown"));
});

test("abduction and adduction are not confused for each other", () => {
  // Two letters apart, opposite movements, opposite muscles -- the scored matcher picked the wrong one
  // until the union-based score replaced dividing by the library entry's own length.
  const abd = resolveLibraryExercise("Hip Abduction Machine")?.exercise.name ?? "";
  assert.match(abd, /Abduction/);
  assert.doesNotMatch(abd, /Adduction/);
});

test("canonicalizeImportedName renames only on a confident match, and records what it replaced", () => {
  const renamed = canonicalizeImportedName("DB Inc Press", "Chest");
  assert.equal(renamed.name, "Incline Dumbbell Press");
  assert.equal(renamed.sourceName, "DB Inc Press");

  // A name already matching the library is not a "rename" and must not be flagged as one.
  const same = canonicalizeImportedName("Incline Dumbbell Press", "Chest");
  assert.equal(same.sourceName, undefined);
});

test("a fuzzy match supplies a muscle but never rewrites the name", () => {
  // The whole safety property: a scored guess is good enough to book volume against and NOT good enough
  // to retitle a coach's exercise behind their back.
  let checked = 0;
  for (const written of ["Banana Split Squat", "Wrist Thing", "Machine Chest Thing"]) {
    const hit = resolveLibraryExercise(written);
    if (hit?.confidence !== "fuzzy") continue;
    checked++;
    assert.equal(canonicalizeImportedName(written).name, written, `"${written}" was renamed on a fuzzy match`);
  }
  assert.ok(checked > 0, "no fuzzy case exercised -- the test is not proving anything");
});

test("an unmatched name keeps the sheet's own muscle, then falls back to General", () => {
  assert.equal(canonicalizeImportedName("Zzzqqq Xylophone Hoist", "Chest").muscle, "Chest");
  assert.equal(canonicalizeImportedName("Zzzqqq Xylophone Hoist").muscle, "General");
});

test("normalizeExerciseName strips punctuation, case and bracketed qualifiers", () => {
  assert.equal(normalizeExerciseName("  Seated Leg Curl — Wide  "), "seated leg curl wide");
});

test("an empty or junk name resolves to nothing rather than guessing", () => {
  for (const junk of ["", "   ", "!!!", "—"]) {
    assert.equal(resolveLibraryExercise(junk), undefined, `"${junk}"`);
  }
});
