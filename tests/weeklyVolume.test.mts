/** Weekly set volume, including the synergist credit.
 *
 * The thing worth protecting here is that indirect work is counted at all. Back work pays the biceps,
 * chest work pays the triceps and front delts, and a model that only counts the primary mover will
 * happily prescribe 20 direct sets of arms on top of 20 sets of pulling and call it in range. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklySetVolume, WEEKLY_SETS } from "../src/generator/weeklyVolume.ts";

const byMuscle = (rows: ReturnType<typeof weeklySetVolume>) => new Map(rows.map((r) => [r.muscle, r]));

test("direct sets are counted as direct", () => {
  const v = byMuscle(weeklySetVolume([{ muscle: "Chest", sets: 12 }]));
  assert.equal(v.get("Chest")?.direct, 12);
});

test("back work books indirect biceps volume", () => {
  const v = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10 }]));
  const bi = v.get("Biceps");
  assert.ok(bi, "no biceps credit from 10 sets of back — the synergist table is not being applied");
  assert.equal(bi.direct, 0, "biceps should get no DIRECT credit from back work");
  assert.ok(bi.effective > 0, "biceps effective volume should be above zero");
  assert.ok(bi.effective < 10, "indirect credit should be fractional, not one-for-one");
});

test("chest work books indirect triceps volume", () => {
  const bi = byMuscle(weeklySetVolume([{ muscle: "Chest", sets: 10 }])).get("Triceps");
  assert.ok(bi && bi.effective > 0 && bi.direct === 0);
});

test("effective volume is never below direct volume", () => {
  for (const row of weeklySetVolume([
    { muscle: "Back", sets: 12 }, { muscle: "Biceps", sets: 8 },
    { muscle: "Chest", sets: 10 }, { muscle: "Triceps", sets: 6 },
  ])) {
    assert.ok(row.effective >= row.direct, `${row.muscle}: effective ${row.effective} < direct ${row.direct}`);
  }
});

test("the verdict bands line up with WEEKLY_SETS", () => {
  const at = (sets: number) => byMuscle(weeklySetVolume([{ muscle: "Calves", sets }])).get("Calves")?.verdict;
  assert.equal(at(WEEKLY_SETS.min - 1), "under");
  assert.equal(at(WEEKLY_SETS.startAt - 1), "low");
  assert.equal(at(WEEKLY_SETS.startAt), "in range");
  assert.equal(at(WEEKLY_SETS.max + 1), "over");
});

test("a client-specific ceiling overrides the default one", () => {
  const rows = byMuscle(weeklySetVolume([{ muscle: "Calves", sets: 14 }], { Calves: 12 }));
  assert.equal(rows.get("Calves")?.verdict, "over", "a learned ceiling of 12 should make 14 sets over");
});

test("rows come back heaviest first", () => {
  const rows = weeklySetVolume([{ muscle: "Calves", sets: 4 }, { muscle: "Chest", sets: 16 }]);
  assert.equal(rows[0].muscle, "Chest");
});

test("no exercises is not a crash", () => {
  assert.deepEqual(weeklySetVolume([]), []);
});

/** Muscles an exercise was TAGGED with by hand, as opposed to ones the synergist table infers.
 *
 * Jack, adding a hip clean: "I want to be able to click on back and I also want to be able to click on full
 * body. and quads and traps." The danger in granting that is arithmetic: if four tagged muscles each took a
 * full set for one set of work, a program would read as four times the volume it actually contains and every
 * over/in-range/under verdict in the app would be wrong. So the tags are fractional, and the primary keeps
 * sole ownership of the set. */

test("a tagged secondary muscle earns fractional credit, never direct", () => {
  const v = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10, secondaryMuscles: ["Traps"] }]));
  const traps = v.get("Traps");
  assert.ok(traps, "a tagged muscle has to appear in the volume report at all");
  assert.equal(traps.direct, 0, "only the PRIMARY owns the set");
  assert.ok(traps.effective > 0, "a tagged muscle with zero credit means the tag did nothing");
  assert.ok(traps.effective < 10, "credit must be fractional, or one set counts as many");
});

test("the primary keeps its full direct credit when other muscles are tagged", () => {
  const v = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10, secondaryMuscles: ["Quads", "Traps"] }]));
  assert.equal(v.get("Back")?.direct, 10, "tagging extra muscles must not dilute the primary");
});

test("tagging the primary as its own secondary does not pay it twice", () => {
  // validateNewExercise dedupes, but a row written before it did, or edited in SQL, can still arrive this way.
  const tagged = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10, secondaryMuscles: ["Back"] }]));
  const plain = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10 }]));
  assert.equal(tagged.get("Back")?.effective, plain.get("Back")?.effective);
});

test("tagged muscles stack with the inferred synergist table rather than replacing it", () => {
  // Back already pays the biceps through SECONDARY. Tagging traps must not cost the biceps that credit.
  const v = byMuscle(weeklySetVolume([{ muscle: "Back", sets: 10, secondaryMuscles: ["Traps"] }]));
  assert.ok((v.get("Biceps")?.effective ?? 0) > 0, "the inferred table still applies");
  assert.ok((v.get("Traps")?.effective ?? 0) > 0, "and so does the tag");
});

test("effective still never drops below direct once muscles are tagged", () => {
  const rows = weeklySetVolume([
    { muscle: "Back", sets: 12, secondaryMuscles: ["Full body", "Quads", "Traps"] },
    { muscle: "Quads", sets: 9 },
  ]);
  for (const row of rows) assert.ok(row.effective >= row.direct, `${row.muscle}: ${row.effective} < ${row.direct}`);
});
