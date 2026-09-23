/** What a load jump costs in reps.
 *
 * `jumpLoad` used to land every promoted set on the BAND FLOOR, "however big the jump", sourced from P11 --
 * the first exposure to an unfamiliar load is inhibited and will not produce the reps arithmetic predicts.
 *
 * Every example that rule was written from is a DUMBBELL jump of 14-17%. On a barbell it is nonsense, and
 * Jack caught it on his own bench: 4x6 @ 225 came back as 230x3, 230x3, 230x3, 225x6. The band floor for 6
 * reps is 3 (the 3-6 strength zone), so a 2.2% load increase was charged at half the session's reps.
 *
 *   "Last week I did 225 for four sets of six and now you're telling me this week to do 230 for this?
 *    This is a straight load of crap."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { repsAfterJump, jumpLoad } from "../src/generator/doubleProgression.ts";
import { proposeNextWeek } from "../src/shared/progressionProposal.ts";
import { bandForReps } from "../src/generator/repRanges.ts";

const band = (reps: number) => {
  const [min, max] = bandForReps(reps);
  return { min, max };
};

test("his own worked example still lands exactly where he put it", () => {
  // "two sets of eight with the thirty fives and then one set of eight with the thirties"
  // 30 -> 35 is 16.7%; one rep at ten reps is worth 10%; so 1.67 reps, rounded up to 2. Ten becomes eight.
  assert.equal(repsAfterJump(10, 30, 35, band(10)), 8);
});

test("a small barbell step costs one rep, not half the set", () => {
  // 225 -> 230 is 2.2%; one rep at six reps is worth 16.7%. The arithmetic cost is a seventh of a rep, and
  // P11 rounds it up to one. The old rule charged three.
  assert.equal(repsAfterJump(6, 225, 230, band(6)), 5);
  assert.notEqual(repsAfterJump(6, 225, 230, band(6)), band(6).min);
});

test("a jump always costs at least one rep, however small", () => {
  // P11's inhibition is real but small. This is the only part of "land on the floor" worth keeping.
  // 14 reps sits inside the 12-15 band with room below it, so the floor does not mask the charge.
  assert.equal(repsAfterJump(14, 500, 502.5, band(14)), 13);
});

test("the band floor is still a floor", () => {
  // A 33% jump on a light dumbbell prices out at more reps than the band has room to give.
  assert.equal(repsAfterJump(10, 15, 20, band(10)), 8, "8 is the floor of the 8-12 band");
});

test("a load jump never buys reps, and a non-jump changes nothing", () => {
  assert.equal(repsAfterJump(8, 100, 100, band(8)), 8);
  assert.equal(repsAfterJump(8, 100, 90, band(8)), 8);
});

test("Jack's bench, end to end", () => {
  const sets = Array.from({ length: 4 }, () => ({ reps: 6, load: 225 }));
  const p = proposeNextWeek({
    name: "Incline Barbell Bench Press", equipment: "barbell", sets, targetReps: 6, effort: 3,
    week: 1, totalWeeks: 6, sessionsPerWeek: 4, units: "lb",
  });
  assert.equal(p.move, "stagger");
  assert.equal(p.next, "3 × 5 @ 230 lb, 1 × 6 @ 225 lb");
  assert.ok(!p.next.includes("× 3"), `never a triple off a set of six: ${p.next}`);
});

test("the stagger still leaves a set behind, which is the whole point of it", () => {
  const out = jumpLoad([{ reps: 6, load: 225 }, { reps: 6, load: 225 }, { reps: 6, load: 225 }], {
    equipment: "barbell", band: band(6),
  });
  assert.deepEqual(out, [
    { load: 230, reps: 5 },
    { load: 230, reps: 5 },
    { reps: 6, load: 225 },
  ]);
});
