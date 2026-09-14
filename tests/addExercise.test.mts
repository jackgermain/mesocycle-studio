import { test } from "node:test";
import assert from "node:assert/strict";
import { addExerciseToProgram, addTargets } from "../src/shared/addExercise";
import { buildProgramFromDraft } from "../src/shared/programConvert";
import type { Program } from "../src/data/types";

/** Adding a movement to a block that is already running.
 *
 * This is scoping logic, which is the kind that fails silently: it books work into sessions the person
 * never agreed to change, or reaches back into a day that has already been trained, and nothing crashes to
 * say so. The rule here also had to be written differently from every other scoped edit in the app -- a
 * swap and a removal both scope by exercise NAME across the block, which an addition cannot do because it
 * has no existing occurrence to match on. A later reader "fixing" that inconsistency is exactly what these
 * assertions exist to stop. */

const ADDED = { name: "Seated Leg Curl", muscle: "Hamstrings", equipment: "machine" as const, hasVideo: false };

/** Two session types, four weeks, so "same type later in the block" and "a different type" are both real. */
function program(): Program {
  return buildProgramFromDraft(
    "Test block",
    [
      { name: "Lower", exercises: [{ name: "Back Squat", muscle: "Quads", sets: 3, reps: 8 }] },
      { name: "Upper", exercises: [{ name: "Bench Press", muscle: "Chest", sets: 3, reps: 8 }] },
    ],
    4,
    "Jack",
  );
}

function everyDay(p: Program) {
  return p.weeks.flatMap((w) => w.days);
}

function has(p: Program, dayId: string, name: string): boolean {
  const day = everyDay(p).find((d) => d.id === dayId);
  return !!day && Object.values(day.exercises).some((e) => e.name === name);
}

test("scope 'day' touches that one session and nothing else", () => {
  const before = program();
  const target = everyDay(before)[0];
  const after = addExerciseToProgram(before, target.id, ADDED, "day", 1);

  assert.ok(has(after, target.id, ADDED.name));
  for (const day of everyDay(after)) {
    if (day.id === target.id) continue;
    assert.ok(!has(after, day.id, ADDED.name), `${day.id} should not have been touched`);
  }
});

test("scope 'mesocycle' reaches later sessions of the SAME type only", () => {
  // The whole point of the rule: a leg curl added on a lower day must not appear on every upper day.
  const before = program();
  const first = everyDay(before).find((d) => d.code === "D1")!;
  const after = addExerciseToProgram(before, first.id, ADDED, "mesocycle", 1);

  const lower = everyDay(after).filter((d) => d.code === "D1");
  const upper = everyDay(after).filter((d) => d.code === "D2");
  assert.ok(lower.length > 1, "fixture needs more than one session of the same type");
  for (const day of lower) assert.ok(has(after, day.id, ADDED.name), `${day.id} is the same type and should have it`);
  for (const day of upper) assert.ok(!has(after, day.id, ADDED.name), `${day.id} is a different session type`);
});

test("a session already logged is never altered, whatever the scope", () => {
  // History stays as it was trained -- the same refusal REMOVE_EXERCISE and SWAP_EXERCISE carry.
  const before = program();
  const days = everyDay(before).filter((d) => d.code === "D1");
  days[1].status = "done";
  const after = addExerciseToProgram(before, days[0].id, ADDED, "mesocycle", 1);

  assert.ok(!has(after, days[1].id, ADDED.name), "a done session must not gain an exercise");
  assert.ok(has(after, days[2].id, ADDED.name), "later sessions still get it");
});

test("'mesocycle' never reaches backwards into an earlier session that was merely missed", () => {
  // status alone does not say this: a session someone skipped is still "visible", not "done". Without the
  // date comparison the addition would land in a day that has already come and gone.
  const before = program();
  const days = everyDay(before).filter((d) => d.code === "D1");
  const anchor = days[2];
  const after = addExerciseToProgram(before, anchor.id, ADDED, "mesocycle", 1);

  assert.ok(!has(after, days[0].id, ADDED.name), "an earlier session must not gain it");
  assert.ok(!has(after, days[1].id, ADDED.name), "an earlier session must not gain it");
  assert.ok(has(after, anchor.id, ADDED.name));
  assert.ok(has(after, days[3].id, ADDED.name));
});

test("the exercise goes in at the end of the order, and the set count follows", () => {
  const before = program();
  const target = everyDay(before)[0];
  const setsBefore = target.setCount;
  const after = addExerciseToProgram(before, target.id, ADDED, "day", 1);
  const day = everyDay(after).find((d) => d.id === target.id)!;

  assert.equal(day.order.length, target.order.length + 1);
  assert.equal(day.exercises[day.order[day.order.length - 1]].name, ADDED.name, "added last, not in the middle");
  assert.equal(day.setCount, setsBefore + 3, "3 sets, and the day's count has to follow or the header lies");
  assert.equal(new Set(day.order).size, day.order.length, "the new id must not be listed twice");
});

test("the day's muscle summary picks up a muscle that wasn't trained there before", () => {
  const before = program();
  const target = everyDay(before).find((d) => d.code === "D2")!; // chest only
  assert.ok(!target.muscleSummary.includes("hamstrings"));
  const after = addExerciseToProgram(before, target.id, ADDED, "day", 1);
  const day = everyDay(after).find((d) => d.id === target.id)!;
  assert.ok(day.muscleSummary.includes("hamstrings"), "the header must not contradict the card under it");
});

test("the program passed in is not modified", () => {
  // The reducer hands it state.program directly; mutating that in place would skip React's update.
  const before = program();
  const target = everyDay(before)[0];
  const countBefore = Object.keys(target.exercises).length;
  addExerciseToProgram(before, target.id, ADDED, "mesocycle", 1);
  assert.equal(Object.keys(everyDay(before)[0].exercises).length, countBefore);
});

test("an unknown day id changes nothing rather than throwing", () => {
  const before = program();
  assert.deepEqual(addTargets(before, "no-such-day", "mesocycle"), []);
  const after = addExerciseToProgram(before, "no-such-day", ADDED, "mesocycle", 1);
  for (const day of everyDay(after)) assert.ok(!has(after, day.id, ADDED.name));
});
