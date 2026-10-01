/** A row is not a press.
 *
 * > "The incline dumbbell row is a back exercise, not a chest exercise."
 *
 * The library had no incline row, so `guessMuscleFromLibrary("Incline Dumbbell Row")` scored it against
 * "Incline Dumbbell Press" — two shared words out of four, the best in the library — and returned CHEST.
 * The muscle is copied onto the exercise when a program is built, so the wrong answer froze into every week
 * of every block, and the soreness check, the pump check and the volume counter all read it. Jack saw it on
 * his pump screen as "CHEST — 3 SETS — Incline Db Row" after I had spent three rounds narrowing a soreness
 * rule that was reading this value and was right to.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { guessMuscleFromLibrary, resolveLibraryExercise } from "../src/coach/exerciseLibrary.ts";
import { retagMisTaggedExercises, RETAG_VERSION } from "../src/shared/retagExercises.ts";

test("a row never resolves to a press, however many qualifiers they share", () => {
  for (const name of ["Incline Dumbbell Row", "Incline Db Row", "Incline DB Row"]) {
    assert.equal(guessMuscleFromLibrary(name), "Back", name);
  }
});

test("the movement word decides, not the qualifiers", () => {
  // Qualifiers are the cheap words. Two names can share every one of them and be opposite movements.
  assert.equal(guessMuscleFromLibrary("Incline Dumbbell Press"), "Chest");
  assert.equal(guessMuscleFromLibrary("Seated Cable Row"), "Back");
  assert.equal(guessMuscleFromLibrary("Dumbbell Lateral Raise"), "Side delts");
  // Fixed by the same guard: this used to match "EZ-Bar Curl" and come back Biceps.
  assert.equal(guessMuscleFromLibrary("EZ Bar Skullcrusher"), "Triceps");
});

test("a name that only one side gives a movement for still resolves by score", () => {
  // "RDL" names no movement this list knows, so the guard abstains and scoring picks the entry — which is
  // what keeps Jack's "deadlifts are not the same thing as romanian deadlifts" ruling working.
  assert.equal(guessMuscleFromLibrary("Barbell RDL"), "Hamstrings");
  assert.equal(guessMuscleFromLibrary("Deadlifts"), "Back");
});

const program = (name: string, muscle: string) => ({
  name: "P", totalWeeks: 2, coachName: "",
  weeks: [1, 2].map((n) => ({
    number: n, phase: "accumulation",
    days: [{
      id: `w${n}`, code: "D3", label: "Day 3", dow: "Wed", date: `2026-09-${22 + n * 7}`, status: "visible",
      muscleSummary: "", setCount: 1, order: ["e1"],
      exercises: {
        e1: {
          id: "e1", name, muscle, metaLine: "", hasVideo: false,
          sets: [{ id: "s1", index: 1, type: "straight", checked: false, actual: null, prescribed: { reps: 10, load: 60 } }],
        },
      },
    }],
  })),
}) as never;

test("a program carrying the wrong muscle is corrected, in every week", () => {
  const { program: fixed, retagged } = retagMisTaggedExercises(program("Incline Dumbbell Row", "Chest"));
  assert.deepEqual(retagged, [{ exercise: "Incline Dumbbell Row", from: "Chest", to: "Back" }]);
  for (const w of (fixed as any).weeks) assert.equal(w.days[0].exercises.e1.muscle, "Back");
  assert.equal((fixed as any).retagVersion, RETAG_VERSION);
});

test("it runs once, so a muscle someone set deliberately is not overwritten forever", () => {
  const once = retagMisTaggedExercises(program("Incline Dumbbell Row", "Chest")).program;
  const his: any = structuredClone(once);
  his.weeks[0].days[0].exercises.e1.muscle = "Chest"; // he wants it chest, for whatever reason
  assert.deepEqual(retagMisTaggedExercises(his).retagged, [], "nothing touched a second time");
  assert.equal(retagMisTaggedExercises(his).program.weeks[0].days[0].exercises.e1.muscle, "Chest");
});

test("a name the library is only FUZZY about is never re-tagged", () => {
  // The fuzzy score is what caused this bug. It does not get to correct it.
  const hit = resolveLibraryExercise("Banana Split Squat");
  assert.equal(hit?.confidence, "fuzzy", "precondition: this is a fuzzy match");
  assert.deepEqual(retagMisTaggedExercises(program("Banana Split Squat", "Hamstrings")).retagged, []);
});

test("a correctly tagged program is left alone", () => {
  assert.deepEqual(retagMisTaggedExercises(program("Seated Cable Row", "Back")).retagged, []);
});
