import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRegion, muscleColorVar, regionOf, REGION_LABELS } from "../src/shared/muscleColor";
import { MUSCLE_GROUPS, libraryExercises } from "../src/coach/exerciseLibrary";

/** Which colour a muscle label is drawn in.
 *
 * `regionOf` falls back to "other" for anything it does not recognise, which is the right behaviour for a
 * custom exercise carrying an unexpected muscle -- but it means a muscle accidentally left out of the map
 * renders amber with no error anywhere. That is the exact shape of quiet wrong this project keeps getting
 * bitten by, so the mapping is pinned rather than trusted. */

test("every muscle group in the taxonomy is mapped deliberately", () => {
  // hasRegion, not `regionOf(m) !== "other"`. The first version of this test used the latter and failed on
  // "Full body" -- which IS mapped, and is mapped to "other" on purpose, because an olympic lift is a
  // movement classification rather than a body part. The assertion contradicted the design it was checking.
  for (const m of MUSCLE_GROUPS) {
    assert.ok(hasRegion(m), `${m} is missing from the region map`);
  }
});

test("every muscle a library exercise names is mapped", () => {
  // The taxonomy check above passes if MUSCLE_GROUPS is complete; this one catches an exercise carrying a
  // muscle string that is not in the taxonomy at all.
  for (const e of libraryExercises) {
    assert.ok(hasRegion(e.muscle), `${e.name} is tagged "${e.muscle}", which is not in the region map`);
  }
});

test("the regions group the way a session is planned", () => {
  // Legs, push, pull, core. Rear delts sit with PULL rather than with the other two delts, deliberately:
  // a rear delt is trained by rowing and face pulls, a front delt by pressing. Grouping the three delts by
  // name would make the colour say something untrue about the session.
  assert.equal(regionOf("Quads"), "legs");
  assert.equal(regionOf("Glutes"), "legs");
  assert.equal(regionOf("Chest"), "push");
  assert.equal(regionOf("Front delts"), "push");
  assert.equal(regionOf("Side delts"), "push");
  assert.equal(regionOf("Triceps"), "push");
  assert.equal(regionOf("Back"), "pull");
  assert.equal(regionOf("Rear delts"), "pull");
  assert.equal(regionOf("Biceps"), "pull");
  assert.equal(regionOf("Abs"), "core");
  assert.equal(regionOf("Obliques"), "core");
});

test("the three delts stay three separate groups", () => {
  // Jack: "keep the three delts separate". RP collapses all three into one "Shoulders"; we do not, and his
  // own doctrine leans on the distinction (G29's front-delt allocation, the lateral-raise rules).
  const delts = MUSCLE_GROUPS.filter((m) => m.includes("delts"));
  assert.deepEqual([...delts], ["Front delts", "Side delts", "Rear delts"]);
});

test("a colour resolves to a CSS variable, never a raw hex", () => {
  // The palette lives in styles.css so it moves with the theme, the same reason nothing outside :root names
  // a typeface. A hex returned here would be a colour that cannot follow a retheme.
  for (const m of MUSCLE_GROUPS) {
    assert.match(muscleColorVar(m), /^var\(--muscle-(legs|push|pull|core|other)\)$/, m);
  }
});

test("an unknown muscle gets a colour rather than crashing or rendering blank", () => {
  assert.equal(regionOf("Hip flexors"), "other");
  assert.equal(muscleColorVar(""), "var(--muscle-other)");
});

test("every region has a label for a legend", () => {
  const labelled = new Set(REGION_LABELS.map((r) => r.region));
  for (const m of MUSCLE_GROUPS) assert.ok(labelled.has(regionOf(m)), `${regionOf(m)} has no label`);
});
