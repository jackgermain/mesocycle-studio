/** Which lifts the Progress tab shows.
 *
 * > "Have the app pick the five main lifts, but have the option to change them, or remove how many of them
 * > are displayed."
 *
 * The pick is one per MOVEMENT PATTERN before any pattern is picked from twice. Ranking by load alone gives
 * five leg machines on a leg-heavy block — a leg press and a hack squat both outweigh a bench — and a
 * screen with two squat variants and no press is not a picture of anyone's training.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickMainLifts, liftSummaries, DEFAULT_MAIN_LIFT_COUNT } from "../src/shared/mainLifts.ts";

let n = 0;
const ex = (name: string, load: number, logged = true) => {
  const id = `e${++n}`;
  return [
    id,
    {
      id, name, muscle: "Quads", metaLine: "", hasVideo: false,
      sets: [{
        id: `${id}-s1`, index: 1, type: "straight", checked: logged,
        actual: logged ? { reps: 5, load } : null,
        prescribed: { reps: 5, load },
      }],
    },
  ] as const;
};

const program = (...days: ReturnType<typeof ex>[][]) => ({
  name: "P", totalWeeks: 1, coachName: "",
  weeks: [{
    number: 1, phase: "accumulation",
    days: days.map((entries, i) => ({
      id: `d${i}`, code: `D${i}`, label: `Day ${i}`, dow: "Mon", date: `2026-09-${14 + i}`,
      status: "done", muscleSummary: "", setCount: entries.length,
      order: entries.map(([k]) => k),
      exercises: Object.fromEntries(entries),
    })),
  }],
}) as never;

test("the five are one per pattern, not the five heaviest", () => {
  /* Every one of these outweighs the bench. Ranked by load alone the screen would be squat, leg press,
   * hack squat, deadlift, bench — two extra squat patterns and no pull at all. */
  const p = program([
    ex("Barbell Back Squat", 315),
    ex("Leg Press — 45°", 500),
    ex("Hack Squat Machine", 400),
    ex("Barbell Deadlift", 405),
    ex("Barbell Bench Press", 225),
    ex("Lat Pulldown — Wide Grip", 180),
    ex("Barbell Bent-Over Row", 185),
    ex("Barbell Overhead Press", 135),
  ]);
  assert.deepEqual(pickMainLifts(p), [
    "Leg Press — 45°",          // squat pattern, heaviest in it
    "Barbell Deadlift",         // hinge
    "Barbell Bench Press",      // horizontal push
    "Lat Pulldown — Wide Grip", // vertical pull
    "Barbell Bent-Over Row",    // horizontal pull
  ]);
});

test("a program with fewer patterns than slots fills from the heaviest left over", () => {
  const p = program([
    ex("Barbell Back Squat", 315),
    ex("Leg Press — 45°", 500),
    ex("Hack Squat Machine", 400),
    ex("Barbell Bench Press", 225),
  ]);
  // One squat, one press, then the squat pattern is allowed a second and third pick.
  assert.deepEqual(pickMainLifts(p), [
    "Leg Press — 45°", "Barbell Bench Press", "Hack Squat Machine", "Barbell Back Squat",
  ]);
});

test("accessories never appear, however heavy", () => {
  const p = program([
    ex("Leg Extension Machine", 300),
    ex("Cable Lateral Raise", 40),
    ex("Barbell Bench Press", 225),
  ]);
  assert.deepEqual(pickMainLifts(p), ["Barbell Bench Press"]);
});

test("a lift that is in the program but never trained has nothing to show", () => {
  const p = program([ex("Barbell Back Squat", 315, false), ex("Barbell Bench Press", 225)]);
  assert.deepEqual(pickMainLifts(p), ["Barbell Bench Press"]);
});

test("count trims the automatic list", () => {
  const p = program([
    ex("Barbell Back Squat", 315),
    ex("Barbell Deadlift", 405),
    ex("Barbell Bench Press", 225),
    ex("Lat Pulldown — Wide Grip", 180),
    ex("Barbell Bent-Over Row", 185),
  ]);
  assert.equal(pickMainLifts(p).length, 5, `default is ${DEFAULT_MAIN_LIFT_COUNT}`);
  // Trimmed from the END of the pattern order, not by load: squat, hinge, push. Cutting the list short
  // should drop the pull, not the squat, because the first patterns are the ones anyone checks first.
  assert.deepEqual(pickMainLifts(p, { count: 3 }), [
    "Barbell Back Squat", "Barbell Deadlift", "Barbell Bench Press",
  ]);
  assert.deepEqual(pickMainLifts(p, { count: 0 }), []);
});

test("his own list wins outright, in his own order", () => {
  // Not merged with the automatic pick, not reordered: a lift he put there stays there even once it stops
  // being his heaviest, which is the entire point of letting him choose.
  const p = program([
    ex("Barbell Back Squat", 315),
    ex("Barbell Deadlift", 405),
    ex("Barbell Bench Press", 225),
    ex("Lat Pulldown — Wide Grip", 180),
  ]);
  assert.deepEqual(
    pickMainLifts(p, { chosen: ["Barbell Bench Press", "Barbell Back Squat"] }),
    ["Barbell Bench Press", "Barbell Back Squat"],
  );
});

test("a chosen lift that has left the program stops appearing", () => {
  // Swapped out mid-block. Showing a stale row forever is worse than showing one fewer.
  const p = program([ex("Barbell Bench Press", 225)]);
  assert.deepEqual(pickMainLifts(p, { chosen: ["Barbell Back Squat", "Barbell Bench Press"] }), ["Barbell Bench Press"]);
});

test("summaries carry the heaviest load and how often it was trained", () => {
  const p = program(
    [ex("Barbell Bench Press", 225)],
    [ex("Barbell Bench Press", 235)],
  );
  const bench = liftSummaries(p).find((s) => s.name === "Barbell Bench Press")!;
  assert.equal(bench.topLoad, 235, "heaviest across the block, not the latest");
  assert.equal(bench.sessions, 2);
  assert.equal(bench.pattern, "horizontal push");
});
