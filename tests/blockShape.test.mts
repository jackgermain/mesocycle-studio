/** Later weeks of a session look like the way it was actually trained.
 *
 * Jack, on week 2 day 1: "The hip clean is at the very end of the day for some reason. You're literally
 * copy-pasting it from last week to this week, with the addition of exercises that may or may not have been
 * removed, and change the numbers on it. That's it."
 *
 * Reordering week 1 used to change week 1 only, so a block could already be in this state -- fixing the
 * reorder stops it recurring but repairs nothing. This is the repair, and it has to be idempotent because
 * it runs on every open.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { alignBlockShape, strayCopies } from "../src/shared/blockShape.ts";

const ex = (week: number, i: number, name: string, checked: boolean) => [
  `w${week}-d1-e${i}`,
  {
    id: `w${week}-d1-e${i}`, name, muscle: "Quads", metaLine: "", hasVideo: false,
    sets: [{ id: `w${week}-e${i}-s1`, index: 1, type: "straight", checked, actual: checked ? { reps: 3, load: 215 } : null, prescribed: { reps: 3, load: 215 } }],
  },
];

const day = (id: string, week: number, date: string, names: string[], o: { done?: boolean; code?: string } = {}) => ({
  id, code: o.code ?? "L1", label: "Day 1", dow: "Mon", date,
  status: o.done ? "done" : "visible", muscleSummary: "", setCount: names.length,
  order: names.map((_, i) => `w${week}-d1-e${i + 1}`),
  exercises: Object.fromEntries(names.map((n, i) => ex(week, i + 1, n, !!o.done))),
});

const namesOf = (p: any, id: string) => {
  const d = p.weeks.flatMap((w: any) => w.days).find((x: any) => x.id === id);
  return d.order.map((k: string) => d.exercises[k].name);
};

/** Week 1 trained with Hip Clean first. Week 2 still carries the generated order, Hip Clean last. */
const WEEK1 = ["Hip Clean", "Back Squat Box", "Lying Leg Curl"];
const WEEK2 = ["Back Squat Box", "Lying Leg Curl", "Hip Clean"];
const block = () => ({
  name: "P", totalWeeks: 3, coachName: "",
  weeks: [
    { number: 1, phase: "accumulation", days: [day("w1", 1, "2026-09-14", WEEK1, { done: true })] },
    { number: 2, phase: "accumulation", days: [day("w2", 2, "2026-09-21", WEEK2)] },
    { number: 3, phase: "accumulation", days: [day("w3", 3, "2026-09-28", WEEK2)] },
  ],
}) as never;

test("later weeks take the order of the week that was actually trained", () => {
  const { program, changed } = alignBlockShape(block());
  assert.deepEqual(changed, ["w2", "w3"]);
  assert.deepEqual(namesOf(program, "w2"), WEEK1, "Hip Clean comes back to the front");
  assert.deepEqual(namesOf(program, "w3"), WEEK1);
  assert.deepEqual(namesOf(program, "w1"), WEEK1, "and the trained week is not touched");
});

test("running it again changes nothing", () => {
  // It runs on every open, so a second pass has to be a no-op or it would churn the saved blob forever.
  const once = alignBlockShape(block()).program;
  const twice = alignBlockShape(once);
  assert.deepEqual(twice.changed, []);
  assert.equal(twice.program, once, "the same object comes back");
});

test("an exercise last week has and this week lacks is NOT invented here", () => {
  /* The additive version of this rule put a seated dumbbell curl onto a leg day in Jack's own block, found
   * within minutes of the deploy. A rule that can invent an exercise on a session is wrong in a way that is
   * obvious to a lifter in seconds and invisible to a test written around the happy path. This one only
   * permutes keys the day already has. */
  const p: any = block();
  p.weeks[1].days[0].order = ["w2-d1-e1", "w2-d1-e2"];
  delete p.weeks[1].days[0].exercises["w2-d1-e3"];
  const { program } = alignBlockShape(p);
  assert.deepEqual(namesOf(program, "w2"), ["Back Squat Box", "Lying Leg Curl"], "two exercises in, two out");
});

test("two different sessions that share a day code are never merged", () => {
  // programConvert numbers days D1, D2... per slot, but appendWeeks copies whatever code a day had and an
  // imported program carries someone else's. A repeated code is how an arm day reaches a leg day.
  const p: any = block();
  p.weeks[0].days.push({ ...day("arm1", 1, "2026-09-16", ["Seated Dumbbell Curl"], { done: true }), code: "L1" });
  p.weeks[1].days.push({ ...day("arm2", 2, "2026-09-23", ["Seated Dumbbell Curl"]), code: "L1" });
  const { program } = alignBlockShape(p);
  assert.deepEqual(namesOf(program, "w2"), WEEK1, "the leg day is judged against the leg day");
  assert.deepEqual(namesOf(program, "arm2"), ["Seated Dumbbell Curl"], "and the arm day against the arm day");
});

test("stray copies the additive version wrote are removed, unless they were trained", () => {
  const p: any = block();
  const d = p.weeks[1].days[0];
  // Exactly the id shape blankCopy produced: <dayId>-<slug>. Nothing else in the app keys an exercise so.
  d.exercises["w2-seated-dumbbell-curl"] = {
    id: "w2-seated-dumbbell-curl", name: "Seated Dumbbell Curl", muscle: "Biceps", metaLine: "", hasVideo: false,
    sets: [{ id: "x1", index: 1, type: "straight", checked: false, actual: null, prescribed: { reps: 10, load: 30 } }],
  };
  d.order = [...d.order, "w2-seated-dumbbell-curl"];
  const { program, removed } = strayCopies(p);
  assert.deepEqual(removed, ["w2:Seated Dumbbell Curl"]);
  assert.deepEqual(namesOf(program, "w2"), WEEK2, "the leg day is its own again");

  // One with a logged set stays: never throw away work someone actually did.
  const trained: any = block();
  const t = trained.weeks[1].days[0];
  t.exercises["w2-seated-dumbbell-curl"] = {
    id: "w2-seated-dumbbell-curl", name: "Seated Dumbbell Curl", muscle: "Biceps", metaLine: "", hasVideo: false,
    sets: [{ id: "x1", index: 1, type: "straight", checked: true, actual: { reps: 10, load: 30 }, prescribed: { reps: 10, load: 30 } }],
  };
  t.order = [...t.order, "w2-seated-dumbbell-curl"];
  assert.deepEqual(strayCopies(trained).removed, []);
});

test("a clean program is left exactly as it is", () => {
  const p = block();
  assert.equal(strayCopies(p).program, p, "the same object comes back");
});

test("an exercise only a later week has is never removed", () => {
  // Removing a movement is its own decision with its own scope. Guessing it from a shape difference would
  // delete work nobody asked to lose.
  const p: any = block();
  p.weeks[1].days[0].exercises["w2-d1-e9"] = ex(2, 9, "Dumbbell Lateral Raise", false)[1];
  p.weeks[1].days[0].order = [...p.weeks[1].days[0].order, "w2-d1-e9"];
  const { program } = alignBlockShape(p);
  assert.deepEqual(namesOf(program, "w2"), [...WEEK1, "Dumbbell Lateral Raise"], "it keeps its place at the end");
});

test("a session already under way is left exactly as it is", () => {
  const p: any = block();
  p.weeks[1].days[0].exercises["w2-d1-e1"].sets[0].checked = true;
  const { program, changed } = alignBlockShape(p);
  assert.deepEqual(namesOf(program, "w2"), WEEK2, "the cards do not move under someone mid-session");
  assert.deepEqual(changed, ["w3"], "but later weeks still line up");
});

test("nothing trained yet means nothing to copy from", () => {
  const p: any = block();
  p.weeks[0].days[0].status = "visible";
  for (const e of Object.values<any>(p.weeks[0].days[0].exercises)) e.sets[0].checked = false;
  const { changed } = alignBlockShape(p);
  assert.deepEqual(changed, [], "the generated shape is the only shape there is");
});

test("a different session type is aligned on its own", () => {
  const p: any = block();
  p.weeks[0].days.push(day("u1", 1, "2026-09-16", ["Bench Press"], { done: true, code: "U1" }));
  p.weeks[1].days.push(day("u2", 2, "2026-09-23", ["Bench Press", "Cable Fly"], { code: "U1" }));
  const { program } = alignBlockShape(p);
  assert.deepEqual(namesOf(program, "u2"), ["Bench Press", "Cable Fly"], "upper is judged against upper");
  assert.deepEqual(namesOf(program, "w2"), WEEK1);
});
