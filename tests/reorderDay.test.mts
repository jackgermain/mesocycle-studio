/** Reordering a session reaches every remaining week of that session.
 *
 * Jack, looking at week 1 and week 2 of the same day side by side: "Why the hell are all my exercises in
 * different places? The split is selected in week one, and it stays like that throughout the whole program."
 *
 * The reducer wrote `day.order` on the one day whose id matched, and TrainingDay.id is unique per week, so
 * it was always exactly one session. The loop looked like it spanned weeks and could not.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { reorderAcrossBlock } from "../src/shared/reorderDay.ts";

/** Exercises keyed per week, the way two of the three program builders key them -- which is why a reorder
 * has to match on NAME and not on key. */
const day = (id: string, week: number, date: string, names: string[], extra: Record<string, unknown> = {}) => ({
  id, code: "L1", label: "Lower", dow: "Mon", date, status: "visible", muscleSummary: "", setCount: names.length,
  order: names.map((_, i) => `w${week}-d1-e${i + 1}`),
  exercises: Object.fromEntries(names.map((name, i) => [
    `w${week}-d1-e${i + 1}`,
    { id: `w${week}-d1-e${i + 1}`, name, muscle: "Quads", metaLine: "", hasVideo: false,
      sets: [{ id: `s${i}`, index: 1, type: "straight", checked: false, actual: null, prescribed: { reps: 8, load: 100 } }] },
  ])),
  ...extra,
});

const NAMES = ["Back Squat Box", "Lying Leg Curl", "Hip Clean"];
const build = (extra2: Record<string, unknown> = {}, extra3: Record<string, unknown> = {}) => ({
  name: "P", totalWeeks: 3, coachName: "",
  weeks: [
    { number: 1, phase: "accumulation", days: [day("w1", 1, "2026-09-14", NAMES)] },
    { number: 2, phase: "accumulation", days: [day("w2", 2, "2026-09-21", NAMES, extra2)] },
    { number: 3, phase: "accumulation", days: [day("w3", 3, "2026-09-28", NAMES, extra3)] },
  ],
}) as never;

const namesOf = (p: any, id: string) => {
  const d = p.weeks.flatMap((w: any) => w.days).find((x: any) => x.id === id);
  return d.order.map((k: string) => d.exercises[k].name);
};

test("reordering week 1 moves every later week of the same session", () => {
  // Hip Clean dragged to the front, exactly what the screenshots showed in week 1 and not in week 2.
  const moved = reorderAcrossBlock(build(), "w1", ["w1-d1-e3", "w1-d1-e1", "w1-d1-e2"]);
  const want = ["Hip Clean", "Back Squat Box", "Lying Leg Curl"];
  assert.deepEqual(namesOf(moved, "w1"), want);
  assert.deepEqual(namesOf(moved, "w2"), want, "week 2 follows, matched by name not by key");
  assert.deepEqual(namesOf(moved, "w3"), want);
});

test("a finished week is never rewritten, and neither is one already being trained", () => {
  const started = build({}, {});
  (started as any).weeks[1].days[0].exercises["w2-d1-e1"].sets[0].checked = true;
  const moved = reorderAcrossBlock(started, "w1", ["w1-d1-e3", "w1-d1-e1", "w1-d1-e2"]);
  assert.deepEqual(namesOf(moved, "w2"), NAMES, "mid-session, so the cards stay where they are");
  assert.deepEqual(namesOf(moved, "w3"), ["Hip Clean", "Back Squat Box", "Lying Leg Curl"], "week 3 still moves");

  const done = reorderAcrossBlock(build({ status: "done" }), "w1", ["w1-d1-e3", "w1-d1-e1", "w1-d1-e2"]);
  assert.deepEqual(namesOf(done, "w2"), NAMES, "history stays as it was trained");
});

test("reordering a later week never reaches backwards into one already trained", () => {
  const moved = reorderAcrossBlock(build(), "w2", ["w2-d1-e3", "w2-d1-e1", "w2-d1-e2"]);
  assert.deepEqual(namesOf(moved, "w1"), NAMES, "week 1 is behind it and untouched");
  assert.deepEqual(namesOf(moved, "w3"), ["Hip Clean", "Back Squat Box", "Lying Leg Curl"]);
});

test("an exercise a later week has and the reordered one does not keeps its place", () => {
  // Week 3 carries a fourth movement. Dropping it out of `order` would make it vanish from the screen.
  const p: any = build();
  p.weeks[2].days[0].exercises["w3-d1-e4"] = {
    id: "w3-d1-e4", name: "Dumbbell Lateral Raise", muscle: "Side delts", metaLine: "", hasVideo: false,
    sets: [{ id: "s4", index: 1, type: "straight", checked: false, actual: null, prescribed: { reps: 12, load: 20 } }],
  };
  p.weeks[2].days[0].order = [...p.weeks[2].days[0].order, "w3-d1-e4"];
  const moved = reorderAcrossBlock(p, "w1", ["w1-d1-e3", "w1-d1-e1", "w1-d1-e2"]);
  assert.deepEqual(namesOf(moved, "w3"), ["Hip Clean", "Back Squat Box", "Lying Leg Curl", "Dumbbell Lateral Raise"]);
});

test("a different session type is left alone", () => {
  const p: any = build();
  p.weeks[1].days.push({ ...day("w2b", 2, "2026-09-23", NAMES), code: "U1" });
  const moved = reorderAcrossBlock(p, "w1", ["w1-d1-e3", "w1-d1-e1", "w1-d1-e2"]);
  assert.deepEqual(namesOf(moved, "w2b"), NAMES, "an upper day is not a lower day");
});
