/** An automatic write may change numbers. It may never change shape.
 *
 * > "There should be no changes in order on any exercises unless I moved them myself, or swapped in an
 * > exercise, or removed an exercise myself. This should never ever ever change. Run an audit on the system
 * > to make sure that this never happens again."
 *
 * The audit found fifteen paths that write to a program with no user action behind them. Most are fine — a
 * progression writing next week's weights is what auto programming is FOR. What none may do is touch shape,
 * and nothing enforced that: every order regression arrived through a reducer case that took a whole
 * replacement Program and trusted it. The guard belongs at the reducer, because the next caller written in
 * six months will not know the rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { keepShape } from "../src/shared/programInvariant.ts";

const exercise = (id: string, name: string, load: number) => [
  id,
  {
    id, name, muscle: "Back", metaLine: "", hasVideo: false,
    sets: [{ id: `${id}-s1`, index: 1, type: "straight", checked: false, actual: null, prescribed: { reps: 8, load } }],
  },
];

const program = (names: string[], load = 100) => ({
  name: "P", totalWeeks: 2, coachName: "",
  weeks: [{
    number: 1, phase: "accumulation",
    days: [{
      id: "d1", code: "D1", label: "Day 1", dow: "Mon", date: "2026-09-30", status: "visible",
      muscleSummary: "", setCount: names.length,
      order: names.map((_, i) => `e${i + 1}`),
      exercises: Object.fromEntries(names.map((n, i) => exercise(`e${i + 1}`, n, load))),
    }],
  }],
}) as never;

const shapeOf = (p: any) => {
  const d = p.weeks[0].days[0];
  return d.order.map((k: string) => d.exercises[k].name);
};
const loadOf = (p: any, key: string) => p.weeks[0].days[0].exercises[key].sets[0].prescribed.load;

const WRITTEN = ["Pull-Up", "Seated Cable Row", "Cable Curl"];

test("new numbers pass straight through — that is what auto programming is for", () => {
  const next = program(WRITTEN, 110);
  const { program: out, undone } = keepShape(program(WRITTEN, 100), next);
  assert.deepEqual(undone, []);
  assert.equal(out, next, "untouched, same object");
  assert.equal(loadOf(out, "e1"), 110);
});

test("a reorder an automatic pass tried to make is discarded, numbers kept", () => {
  const scrambled: any = program(WRITTEN, 110);
  scrambled.weeks[0].days[0].order = ["e2", "e3", "e1"];
  const { program: out, undone } = keepShape(program(WRITTEN, 100), scrambled);
  assert.deepEqual(shapeOf(out), WRITTEN, "order is the one that was already there");
  assert.equal(loadOf(out, "e1"), 110, "but the new weight survives");
  assert.equal(undone[0].reordered, true);
});

test("an exercise an automatic pass invented is dropped", () => {
  // Exactly the seated-dumbbell-curl-on-a-leg-day bug, now structurally impossible from a background write.
  const extra: any = program(WRITTEN);
  const [k, v] = exercise("e9", "Seated Dumbbell Curl", 30);
  extra.weeks[0].days[0].exercises[k] = v;
  extra.weeks[0].days[0].order = [...extra.weeks[0].days[0].order, k];
  const { program: out, undone } = keepShape(program(WRITTEN), extra);
  assert.deepEqual(shapeOf(out), WRITTEN);
  assert.deepEqual(undone[0].added, ["Seated Dumbbell Curl"]);
});

test("an exercise an automatic pass deleted is put back", () => {
  const fewer: any = program(WRITTEN);
  delete fewer.weeks[0].days[0].exercises.e1;
  fewer.weeks[0].days[0].order = ["e2", "e3"];
  const { program: out, undone } = keepShape(program(WRITTEN), fewer);
  assert.deepEqual(shapeOf(out), WRITTEN, "pull-ups come back");
  assert.deepEqual(undone[0].removed, ["Pull-Up"]);
});

test("a day that did not exist before passes through — a block being extended is not a shape change", () => {
  const before = program(WRITTEN);
  const after: any = structuredClone(before);
  after.weeks.push({
    number: 2, phase: "accumulation",
    days: [{
      id: "d2", code: "D1", label: "Day 1", dow: "Mon", date: "2026-10-07", status: "visible",
      muscleSummary: "", setCount: 1, order: ["x1"], exercises: Object.fromEntries([exercise("x1", "Pull-Up", 100)]),
    }],
  });
  const { undone } = keepShape(before, after);
  assert.deepEqual(undone, [], "nothing to preserve, nothing undone");
});

test("setCount is recomputed rather than left stale after a repair", () => {
  const extra: any = program(WRITTEN);
  const [k, v] = exercise("e9", "Seated Dumbbell Curl", 30);
  extra.weeks[0].days[0].exercises[k] = v;
  extra.weeks[0].days[0].order = [...extra.weeks[0].days[0].order, k];
  extra.weeks[0].days[0].setCount = 4;
  const { program: out } = keepShape(program(WRITTEN), extra);
  assert.equal(out.weeks[0].days[0].setCount, 3);
});
