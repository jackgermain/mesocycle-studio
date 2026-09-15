import { test } from "node:test";
import assert from "node:assert/strict";
import { patternOf, PATTERNS } from "../src/generator/patterns";
import { libraryExercises } from "../src/coach/exerciseLibrary";

/** Which movement pattern an exercise performs, which is what decides whether the generator may use it to
 * OPEN a session or only to fill an accessory slot.
 *
 * `select.ts` reads this twice and in opposite directions: `forPattern` fills compound slots from exercises
 * that have a pattern, and `forMuscle` fills accessory slots from exercises that have none. So a wrong
 * answer here does not crash -- it quietly puts the wrong kind of movement in the wrong kind of slot, which
 * is exactly the failure this file exists to catch. */

const named = (n: string) => patternOf(n)?.pattern;

test("shrugs have no pattern at all -- they are isolation", () => {
  // Jack: "shrugs are isolation and are in a category of their own neither vertical or horizontal even
  // though technically vertical." They were filed as a horizontal pull, alongside rows, which made them
  // compounds eligible to lead a session and left Traps with three compounds and zero isolation.
  for (const n of ["Barbell Shrug", "Dumbbell Shrug", "Trap Bar Shrug", "Shrugs"]) {
    assert.equal(named(n), undefined, `"${n}" should not carry a movement pattern`);
  }
});

test("every trap exercise in the library is isolation", () => {
  // The consequence of the rule above, stated where it is actually observable: with no isolation at all,
  // Traps accessory slots fell through to compoundsForMuscle, a fallback meant for the
  // dumbbells-at-home case.
  const traps = libraryExercises.filter((e) => e.muscle === "Traps");
  assert.ok(traps.length > 0, "fixture: the library should have trap exercises");
  for (const e of traps) assert.equal(patternOf(e.name), undefined, `${e.name} should be isolation`);
});

test("removing shrugs did not take rows with them", () => {
  // The rule they shared was /row|shrug/. Dropping the wrong half would empty the horizontal pull slot.
  for (const n of ["Seated Cable Row", "Barbell Bent-Over Row", "Chest-Supported Row", "T-Bar Row"]) {
    assert.equal(named(n), "horizontal pull", `"${n}"`);
  }
});

test("deadlifts are hinges, conventional and Romanian alike", () => {
  for (const n of ["Barbell Deadlift", "Trap Bar Deadlift", "Sumo Deadlift", "Romanian Deadlift", "Stiff-Leg Deadlift"]) {
    assert.equal(named(n), "hinge", `"${n}"`);
  }
});

test("a vertical pull is not read as a horizontal one", () => {
  // Ordering inside RULES carries this: a loose /pull/ would swallow pulldowns and pull-ups into rows.
  for (const n of ["Pull-Up", "Chin-Up", "Lat Pulldown — Wide Grip"]) {
    assert.equal(named(n), "vertical pull", `"${n}"`);
  }
});

test("every pattern still has exercises that can fill it", () => {
  // A compound slot with an empty pool is a session the generator cannot build. Cheap insurance against a
  // regex edit that looks harmless and quietly empties one.
  for (const p of PATTERNS) {
    const pool = libraryExercises.filter((e) => patternOf(e.name)?.pattern === p);
    assert.ok(pool.length >= 3, `pattern "${p}" has only ${pool.length} candidates`);
  }
});

test("isolation work never claims a compound pattern", () => {
  // Spot-check across muscles: these are single-joint movements and must stay in the accessory pool.
  for (const n of ["Dumbbell Lateral Raise", "Barbell Curl", "Cable Crunch", "Seated Leg Curl", "Leg Extension Machine"]) {
    assert.equal(named(n), undefined, `"${n}" should be isolation`);
  }
});
