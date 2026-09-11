/** The how-hard rating is mandatory. What is owed is derived from the logged sets, so these pin the cases
 * that used to slip through: a set ticked somewhere other than the checkbox, a question lost to leaving
 * the screen, and a session ended before the last set. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { effortOwedSet, effortOwedOnEarlyEnd, effortOwedForDay } from "../src/shared/effortOwed.ts";

const set = (id: string, o: Record<string, unknown> = {}) => ({
  id, index: 0, type: "straight", checked: false, actual: null,
  prescribed: { reps: 10, load: 100, effort: { scale: "RIR", value: 2 }, restSec: 90 }, ...o,
});
const ex = (id: string, sets: unknown[]) => ({ id, name: id, muscle: "Chest", metaLine: "", hasVideo: false, sets });

test("nothing is owed until the last working set is ticked", () => {
  assert.equal(effortOwedSet(ex("a", [set("1", { checked: true }), set("2")]) as never), null);
});

test("a ticked last set with no rating is owed, however it was ticked", () => {
  const owed = effortOwedSet(ex("a", [set("1", { checked: true }), set("2", { checked: true, type: "cluster" })]) as never);
  assert.equal(owed?.id, "2");
});

test("once rated, nothing is owed", () => {
  assert.equal(effortOwedSet(ex("a", [set("1", { checked: true }), set("2", { checked: true, effort: 3 })]) as never), null);
});

test("warm-ups and removed sets are not the last set", () => {
  const e = ex("a", [set("w", { isWarmup: true }), set("1", { checked: true }), set("2", { removed: { reason: "time" } })]);
  assert.equal(effortOwedSet(e as never)?.id, "1");
});

test("an extra set added after rating moves the question to the new last set", () => {
  const e = ex("a", [set("1", { checked: true }), set("2", { checked: true, effort: 4 }), set("3", { checked: true })]);
  assert.equal(effortOwedSet(e as never)?.id, "3");
});

test("ending early asks about the last set actually done on a started exercise", () => {
  assert.equal(effortOwedOnEarlyEnd(ex("a", [set("1", { checked: true }), set("2", { checked: true }), set("3")]) as never)?.id, "2");
  assert.equal(effortOwedOnEarlyEnd(ex("b", [set("1"), set("2")]) as never), null, "never started owes nothing");
  assert.equal(effortOwedOnEarlyEnd(ex("c", [set("1", { checked: true, effort: 3 }), set("2")]) as never), null, "already rated");
});

test("a day lists what it owes in session order", () => {
  const day = {
    id: "d", code: "U1", label: "Upper", dow: "Mon", date: "2026-09-10", status: "today", muscleSummary: "", setCount: 0,
    order: ["b", "a"],
    exercises: {
      a: ex("a", [set("a1", { checked: true })]),
      b: ex("b", [set("b1", { checked: true }), set("b2")]),
    },
  };
  assert.deepEqual(effortOwedForDay(day as never), [{ exerciseId: "a", setId: "a1" }]);
  assert.deepEqual(effortOwedForDay(day as never, true), [{ exerciseId: "b", setId: "b1" }, { exerciseId: "a", setId: "a1" }]);
});
