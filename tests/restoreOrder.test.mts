/** Putting exercise order back after a bug of mine scrambled it.
 *
 * > "Why the hell is all of my stuff out of order? If you look at what I did last week on the same day, the
 * > order should be exactly the same. There should be no changes in order on any exercises unless I moved
 * > them myself, or swapped in an exercise, or removed an exercise myself."
 *
 * `alignBlockShape` rewrote later weeks to match the order of the last COMPLETED session — so an in-session
 * "station busy" shuffle in week 2 became the order for week 3. Deleting it could not undo what it had
 * already written into a saved program. This is the undo, and the second time this project has needed one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreProgrammedOrder, ORDER_REPAIR_VERSION } from "../src/shared/restoreOrder.ts";

const ex = (week: number, i: number, name: string, checked = false) => [
  `w${week}-e${i}`,
  {
    id: `w${week}-e${i}`, name, muscle: "Back", metaLine: "", hasVideo: false,
    sets: [{ id: `w${week}-e${i}-s1`, index: 1, type: "straight", checked, actual: null, prescribed: { reps: 8, load: 100 } }],
  },
];

const day = (id: string, week: number, date: string, names: string[], o: { done?: boolean; code?: string } = {}) => ({
  id, code: o.code ?? "D3", label: "Day 3", dow: "Wed", date,
  status: o.done ? "done" : "visible", muscleSummary: "", setCount: names.length,
  order: names.map((_, i) => `w${week}-e${i + 1}`),
  exercises: Object.fromEntries(names.map((n, i) => ex(week, i + 1, n, !!o.done))),
});

const WRITTEN = ["Pull-Up", "Seated Cable Row", "Cable Curl"];
/** What the deleted pass left behind: pull-ups shoved to the end. */
const SCRAMBLED = ["Seated Cable Row", "Cable Curl", "Pull-Up"];

const block = (w2 = SCRAMBLED, w3 = SCRAMBLED, o2 = {}, o3 = {}) => ({
  name: "P", totalWeeks: 3, coachName: "",
  weeks: [
    { number: 1, phase: "accumulation", days: [day("w1", 1, "2026-09-16", WRITTEN, { done: true })] },
    { number: 2, phase: "accumulation", days: [day("w2", 2, "2026-09-23", w2, o2)] },
    { number: 3, phase: "accumulation", days: [day("w3", 3, "2026-09-30", w3, o3)] },
  ],
}) as never;

const namesOf = (p: any, id: string) => {
  const d = p.weeks.flatMap((w: any) => w.days).find((x: any) => x.id === id);
  return d.order.map((k: string) => d.exercises[k].name);
};

test("later weeks go back to the order of the week the block was written in", () => {
  const { program, restored } = restoreProgrammedOrder(block());
  assert.deepEqual(restored, ["w2", "w3"]);
  assert.deepEqual(namesOf(program, "w3"), WRITTEN, "pull-ups come back to the front");
  assert.deepEqual(namesOf(program, "w2"), WRITTEN);
  assert.deepEqual(namesOf(program, "w1"), WRITTEN, "and the written week is never touched");
});

test("it runs exactly once, so a reorder he makes later is his to keep", () => {
  /* The whole reason for the stamp. A repair that re-ran on every open would snap back a deliberate
   * reorder on the very next render — which is the behaviour being apologised for, in a new costume. */
  const once = restoreProgrammedOrder(block()).program;
  assert.equal(once.orderRepairVersion, ORDER_REPAIR_VERSION);

  // He now moves pull-ups to the end himself, in week 3.
  const his: any = structuredClone(once);
  const d = his.weeks[2].days[0];
  d.order = [d.order[1], d.order[2], d.order[0]];

  const again = restoreProgrammedOrder(his);
  assert.deepEqual(again.restored, [], "nothing is touched a second time");
  assert.deepEqual(namesOf(again.program, "w3"), SCRAMBLED, "his own order stands");
});

test("a session already finished or under way is left exactly as it was", () => {
  const done = restoreProgrammedOrder(block(SCRAMBLED, SCRAMBLED, { done: true })).program;
  assert.deepEqual(namesOf(done, "w2"), SCRAMBLED, "history stays as it was trained");
  assert.deepEqual(namesOf(done, "w3"), WRITTEN, "later weeks still corrected");

  const live: any = block();
  live.weeks[2].days[0].exercises["w3-e1"].sets[0].checked = true;
  assert.deepEqual(namesOf(restoreProgrammedOrder(live).program, "w3"), SCRAMBLED, "mid-session, cards stay put");
});

test("an exercise only a later week has keeps its place instead of vanishing", () => {
  const extra = [...SCRAMBLED, "Face Pull"];
  const { program } = restoreProgrammedOrder(block(SCRAMBLED, extra));
  assert.deepEqual(namesOf(program, "w3"), [...WRITTEN, "Face Pull"]);
});

test("membership is never changed — only keys the day already has are moved", () => {
  const { program } = restoreProgrammedOrder(block());
  const d = program.weeks[2].days[0];
  assert.equal(Object.keys(d.exercises).length, 3);
  assert.equal(d.order.length, 3, "three in, three out");
});

test("two different sessions sharing a day code are never merged", () => {
  const p: any = block();
  p.weeks[1].days.push({ ...day("legs2", 2, "2026-09-25", ["Barbell Back Squat"]), code: "D3" });
  p.weeks[2].days.push({ ...day("legs3", 3, "2026-10-02", ["Barbell Back Squat"]), code: "D3" });
  const { program } = restoreProgrammedOrder(p);
  assert.deepEqual(namesOf(program, "w3"), WRITTEN, "the back day is judged against the back day");
  assert.deepEqual(namesOf(program, "legs3"), ["Barbell Back Squat"]);
});
