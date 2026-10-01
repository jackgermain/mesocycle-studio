/** Supersets: which exercises are one round, and what that changes.
 *
 * > "I may want to superset tricep pushdowns and cable curls back to back with no rest in between, and each
 * > time I complete one of each that is one set. So I'd like to be able to add one or even more exercises
 * > to be able to superset, and then be able to have rep progressions and set progressions for them
 * > individually."
 *
 * The doctrine was already written from his words in generator/superset.ts and had zero callers, with
 * nowhere on an exercise to record membership. These pin the half that was missing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupsOf, groupFor, roundLabels, showsRestAfter, roundsIn, setSuperset,
} from "../src/shared/supersetGroups.ts";

const ex = (id: string, name: string, sets: number, supersetId?: string) => [
  id,
  {
    id, name, muscle: "Triceps", metaLine: "", hasVideo: false,
    ...(supersetId ? { supersetId } : {}),
    sets: Array.from({ length: sets }, (_, i) => ({
      id: `${id}-s${i}`, index: i + 1, type: "straight", checked: false, actual: null,
      prescribed: { reps: 12, load: 50, restSec: 90 },
    })),
  },
];

const day = (entries: ReturnType<typeof ex>[]) => ({
  id: "d1", code: "D1", label: "Day 1", dow: "Mon", date: "2026-09-30", status: "visible",
  muscleSummary: "", setCount: 0,
  order: entries.map(([k]) => k as string),
  exercises: Object.fromEntries(entries),
}) as never;

const PAIR = day([
  ex("e1", "Barbell Bench Press", 4),
  ex("e2", "Tricep Rope Pushdown", 3, "ss1"),
  ex("e3", "Cable Curl", 3, "ss1"),
  ex("e4", "Standing Calf Raise Machine", 3),
]);

test("consecutive exercises sharing an id are one round", () => {
  assert.deepEqual(groupsOf(PAIR).map((g) => g.keys), [["e1"], ["e2", "e3"], ["e4"]]);
});

test("three or more in a round works the same way", () => {
  const triple = day([
    ex("e1", "Tricep Rope Pushdown", 3, "ss1"),
    ex("e2", "Cable Curl", 3, "ss1"),
    ex("e3", "Dumbbell Lateral Raise", 3, "ss1"),
  ]);
  assert.deepEqual(groupsOf(triple).map((g) => g.keys), [["e1", "e2", "e3"]]);
});

test("an id split apart by a reorder is two groups, not one impossible round", () => {
  // A round is performed back to back. If something is moved between the members, it is not a round any
  // more, and reading the stored id as though it were would describe a session nobody can do.
  const split: any = day([
    ex("e1", "Tricep Rope Pushdown", 3, "ss1"),
    ex("e2", "Barbell Bench Press", 4),
    ex("e3", "Cable Curl", 3, "ss1"),
  ]);
  assert.deepEqual(groupsOf(split).map((g) => g.keys), [["e1"], ["e2"], ["e3"]]);
});

test("rest comes after the round, never inside it", () => {
  // "You don't rest in between sets of a superset. That's why it's called a superset."
  assert.equal(showsRestAfter(PAIR, "e2"), false, "straight into the curl");
  assert.equal(showsRestAfter(PAIR, "e3"), true, "rest after the round");
  assert.equal(showsRestAfter(PAIR, "e1"), true, "an exercise on its own always rests");
});

test("members are labelled by round, the way a superset is written on paper", () => {
  const labels = roundLabels(PAIR);
  assert.equal(labels.e2, "A1");
  assert.equal(labels.e3, "A2");
  assert.equal(labels.e1, undefined, "an exercise on its own gets no round label");
});

test("one round is one set of each, and members may differ in length", () => {
  // "Each time I complete one of each, that is one set." A 3x12 paired with a 2x15 is legitimate; the
  // shorter one simply drops out of the last round.
  const uneven = day([ex("e1", "Tricep Rope Pushdown", 3, "ss1"), ex("e2", "Cable Curl", 2, "ss1")]);
  assert.equal(roundsIn(uneven, groupsOf(uneven)[0]), 3);
  assert.equal(groupFor(uneven, "e2")!.position, 1);
});

test("grouping requires the members to be adjacent", () => {
  const split: any = day([ex("e1", "A", 3), ex("e2", "B", 3), ex("e3", "C", 3)]);
  assert.equal(setSuperset(split, ["e1", "e3"], "ss1"), null, "a gap is refused, not silently written");
  assert.ok(setSuperset(split, ["e1", "e2"], "ss1"), "neighbours are fine");
});

test("grouping and ungrouping leave every other exercise untouched", () => {
  const made = setSuperset(PAIR, ["e1", "e2"], "ss2")!;
  assert.equal(made.e1.supersetId, "ss2");
  assert.equal(made.e2.supersetId, "ss2");
  assert.equal(made.e3.supersetId, "ss1", "the other group is not disturbed");
  assert.equal(made.e4.supersetId, undefined);

  const broken = setSuperset(PAIR, ["e2", "e3"], null)!;
  assert.equal(broken.e2.supersetId, undefined);
  assert.equal(broken.e3.supersetId, undefined);
});

test("a single exercise cannot be a superset on its own", () => {
  assert.equal(setSuperset(PAIR, ["e1"], "ss9"), null);
});

test("every member keeps its own sets — that is what makes progressions individual", () => {
  // The whole reason this needed no change to the progression engine: a superset is an order of execution
  // and a rest rule, not a shared prescription.
  const made = setSuperset(PAIR, ["e1", "e2"], "ss2")!;
  assert.equal(made.e1.sets.length, 4);
  assert.equal(made.e2.sets.length, 3);
});
