/** What the Progress tab shows, and why none of it is stored.
 *
 * Every figure is derived on read. Jack: "Make sure these graphs live update when data is inputted
 * immediately." They do because there is nothing to update — the day cell, the week average, the delta bar
 * and the verdict are all recomputed from the same array that just changed. A value written once into the
 * jsonb blob is frozen at its single write point, which is how his calories sat 300 light for a day and his
 * bench sat at 230x3 after the arithmetic behind it was fixed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { weekWeighIns, weeklyDeltas, dailyIntake, liftMoves } from "../src/shared/progressSummary.ts";

const w = (date: string, weight: number) => ({ date, weight });

test("a week returns all seven days, including the ones with no reading", () => {
  /* The gaps ARE the point. An average built from three readings is a different number from one built
   * from seven, and a screen that silently averages around the blanks never says which it is showing. */
  const days = weekWeighIns([w("2026-09-28", 203.2), w("2026-09-30", 203.4)], "2026-09-28");
  assert.equal(days.length, 7);
  assert.deepEqual(days.map((d) => d.letter), ["M", "T", "W", "T", "F", "S", "S"]);
  assert.equal(days[0].weight, 203.2);
  assert.equal(days[1].weight, null, "Tuesday was missed, and says so");
  assert.equal(days[2].weight, 203.4);
  assert.equal(days.filter((d) => d.weight !== null).length, 2);
});

test("week over week is the change in the AVERAGE, not the change in any one day", () => {
  // "It doesn't matter if the scale goes up for one day. What we're comparing is the week over week
  // average." Monday of week two is 1.4 lb above Monday of week one; the averages are 0.2 apart.
  const deltas = weeklyDeltas([
    w("2026-09-21", 202.0), w("2026-09-23", 203.4), w("2026-09-25", 203.6),
    w("2026-09-28", 203.4), w("2026-09-30", 203.2),
  ]);
  assert.equal(deltas.length, 2);
  assert.equal(deltas[0].change, null, "the first week has nothing to compare to");
  assert.equal(deltas[0].average, 203);
  assert.equal(deltas[1].average, 203.3);
  assert.equal(deltas[1].change, 0.3);
  assert.equal(deltas[1].points, 2, "and how many readings it rests on");
});

test("a new weigh-in moves the average and the delta on the same pass", () => {
  // The live-update property, stated as a test: nothing is cached, so adding a reading is the whole update.
  const before = [w("2026-09-21", 203.0), w("2026-09-28", 203.0)];
  assert.equal(weeklyDeltas(before)[1].change, 0);
  const after = [...before, w("2026-09-30", 204.0)];
  assert.equal(weeklyDeltas(after)[1].average, 203.5);
  assert.equal(weeklyDeltas(after)[1].change, 0.5);
});

const meal = (date: string, items: { kcal: number; eaten?: boolean }[]) => ({
  id: `m-${date}-${items.length}`, name: "Meal", date,
  items: items.map((it, i) => ({ id: `f${i}`, name: "Food", kcal: it.kcal, protein: 0, carbs: 0, fat: 0, ...it })),
});

test("daily calories count the same items the Nutrition tab counts", () => {
  // Anything not explicitly un-ticked, so the two screens can never disagree about what a day came to.
  const meals = [
    meal("2026-09-28", [{ kcal: 600 }, { kcal: 900 }]),
    meal("2026-09-29", [{ kcal: 700 }, { kcal: 500, eaten: false }]),
  ] as never;
  const days = dailyIntake(meals, "2026-09-28", 3);
  assert.deepEqual(days.map((d) => d.kcal), [1500, 700, 0]);
  assert.deepEqual(days.map((d) => d.logged), [true, true, false]);
  assert.equal(days[2].date, "2026-09-30", "the span continues past the last logged day");
});

let n = 0;
const session = (date: string, name: string, load: number, reps: number) => {
  const id = `e${++n}`;
  return {
    id: `d${n}`, code: "D1", label: "Day", dow: "Mon", date, status: "done",
    muscleSummary: "", setCount: 1, order: [id],
    exercises: {
      [id]: {
        id, name, muscle: "Chest", metaLine: "", hasVideo: false,
        sets: [{
          id: `${id}-s1`, index: 1, type: "straight", checked: true,
          actual: { reps, load }, prescribed: { reps, load },
        }],
      },
    },
  };
};

const program = (...days: ReturnType<typeof session>[]) => ({
  name: "P", totalWeeks: 3, coachName: "",
  weeks: [{ number: 1, phase: "accumulation", days }],
}) as never;

test("a lift reports its latest top set and what changed", () => {
  const p = program(
    session("2026-09-16", "Barbell Bench Press", 215, 6),
    session("2026-09-23", "Barbell Bench Press", 225, 6),
  );
  const [bench] = liftMoves(p, ["Barbell Bench Press"], "lb");
  assert.equal(bench.topSet, "6 × 225 lb");
  assert.deepEqual(bench.change, { label: "+10 lb", direction: "up" });
  assert.deepEqual(bench.history, [215, 225]);
});

test("load leads reps: a week the bar went up never reads as a regression", () => {
  // 225x7 -> 230x5 is a jump paid for in reps, which is the rule working. Reporting "-2 reps" about it
  // would describe the one part that went down and hide the part that went up.
  const p = program(
    session("2026-09-16", "Barbell Bench Press", 225, 7),
    session("2026-09-23", "Barbell Bench Press", 230, 5),
  );
  assert.deepEqual(liftMoves(p, ["Barbell Bench Press"], "lb")[0].change, { label: "+5 lb", direction: "up" });
});

test("same weight and more reps is a move; same weight and same reps is a hold", () => {
  const climbed = program(
    session("2026-09-16", "Barbell Bench Press", 225, 6),
    session("2026-09-23", "Barbell Bench Press", 225, 7),
  );
  assert.deepEqual(liftMoves(climbed, ["Barbell Bench Press"], "lb")[0].change, { label: "+1 rep", direction: "up" });

  const held = program(
    session("2026-09-16", "Barbell Bench Press", 225, 6),
    session("2026-09-23", "Barbell Bench Press", 225, 6),
  );
  assert.deepEqual(liftMoves(held, ["Barbell Bench Press"], "lb")[0].change, { label: "held", direction: "flat" });
});

test("a lift trained once has a top set and no change to report", () => {
  const p = program(session("2026-09-23", "Barbell Bench Press", 225, 6));
  const [bench] = liftMoves(p, ["Barbell Bench Press"], "lb");
  assert.equal(bench.topSet, "6 × 225 lb");
  assert.equal(bench.change, null, "nothing to compare against, so nothing is claimed");
});

test("a lift never trained shows a dash rather than a zero", () => {
  const p = program(session("2026-09-23", "Barbell Bench Press", 225, 6));
  const [squat] = liftMoves(p, ["Barbell Back Squat"], "lb");
  assert.equal(squat.topSet, "—");
  assert.deepEqual(squat.history, []);
});
