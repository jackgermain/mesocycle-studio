/** The rep band comes from how an exercise was PROGRAMMED, not from what it is doing this week.
 *
 * `bandForReps` derived a band from the current rep count, and that single invention produced both
 * progressions Jack rejected — in opposite directions:
 *
 *   Bench 4x6 @ 225 -> bandForReps(6) is the 3-6 strength zone, so 6 read as the TOP (jump the load) and
 *   the promoted sets landed on the FLOOR of 3. "Last week I did 225 for four sets of six and now you're
 *   telling me this week to do 230 for this? This is a straight load of crap."
 *
 *   Leg curl 2x14 -> the band "preferred the zone with room to grow in", so it chased the reps upward and
 *   the load lever never fired. "I did two sets of 14 last time... why not add a little bit of load and
 *   keep the volume the same?"
 *
 * His rule, verbatim: "I may keep the reps above eight reps at all times regardless of whether I make a
 * weight jump... by the time that they can do eleven or twelve reps for three sets, I might jump the thirty
 * fives." Fixed band, programmed reps in the middle, load moves at the top.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { programmedBand, proposeNextWeek } from "../src/shared/progressionProposal.ts";

const set = (i: number, reps: number, load: number, o: Record<string, unknown> = {}) => ({
  id: `s${i}`, index: i, type: "straight", checked: true, actual: { reps, load },
  prescribed: { reps, load, effort: { scale: "RIR", value: 2 }, restSec: 90 }, ...o,
});

/** Week 1 as written, then a week 2 that a bad progression has already drifted. */
const program = (w1Reps: number, w2Reps: number) => ({
  name: "P", totalWeeks: 6, coachName: "",
  weeks: [
    {
      number: 1, phase: "accumulation",
      days: [{
        id: "w1", code: "D1", label: "Day 1", dow: "Mon", date: "2026-09-14", status: "done",
        muscleSummary: "", setCount: 2, order: ["e1"], feedbackDone: true,
        exercises: {
          e1: {
            id: "e1", name: "Lying Leg Curl", muscle: "Hamstrings", metaLine: "", hasVideo: false,
            equipment: "machine", sets: [set(1, w1Reps, 130), set(2, w1Reps, 130)],
          },
        },
      }],
    },
    {
      number: 2, phase: "accumulation",
      days: [{
        id: "w2", code: "D1", label: "Day 1", dow: "Mon", date: "2026-09-21", status: "visible",
        muscleSummary: "", setCount: 2, order: ["e1"],
        exercises: {
          e1: {
            id: "e1", name: "Lying Leg Curl", muscle: "Hamstrings", metaLine: "", hasVideo: false,
            equipment: "machine", sets: [set(1, w2Reps, 130, { checked: false, actual: null }), set(2, w2Reps, 130, { checked: false, actual: null })],
          },
        },
      }],
    },
  ],
}) as never;

test("the band is read from the week the exercise was written in, not the drifted one", () => {
  // Week 1 says 12. Week 2 has already been pushed to 15 by the old rule. The band must still be 10-14.
  assert.deepEqual(programmedBand(program(12, 15), "Lying Leg Curl"), { min: 10, max: 14 });
});

test("an exercise the program does not contain has no band", () => {
  assert.equal(programmedBand(program(12, 12), "Barbell Back Squat"), null);
});

const bench = (band?: { min: number; max: number }, effort = 3) =>
  proposeNextWeek({
    name: "Incline Barbell Bench Press", equipment: "barbell",
    sets: Array.from({ length: 4 }, () => ({ reps: 6, load: 225 })),
    band, targetReps: 6, effort, week: 1, totalWeeks: 6, sessionsPerWeek: 4, units: "lb",
  });

test("his bench climbs reps inside its band instead of jumping the load", () => {
  // Programmed at 6, so the band is 4-8 and 6 sits in the MIDDLE. Nothing has been earned yet.
  const p = bench({ min: 4, max: 8 });
  assert.equal(p.move, "reps");
  assert.equal(p.next, "4 × 7 @ 225 lb");
  assert.ok(!p.next.includes("× 3"), `never a triple off a set of six: ${p.next}`);
});

test("without a band it still does the old, wrong thing — which is why the band is passed", () => {
  // Pinned deliberately. bandForReps(6) is the 3-6 zone, so 6 reads as the top and the load jumps.
  assert.equal(bench(undefined).move, "stagger");
});

const legCurl = (reps: number, band: { min: number; max: number }) =>
  proposeNextWeek({
    name: "Lying Leg Curl", equipment: "machine",
    sets: Array.from({ length: 2 }, () => ({ reps, load: 130 })),
    band, targetReps: 12, effort: 3, week: 1, totalWeeks: 6, sessionsPerWeek: 4, units: "lb",
  });

test("at the top of the band the load finally moves, and the volume does not change", () => {
  /* His own worked example of exactly this: "if she's doing three sets of twelve at thirty fives and is
   * grinding hard, what I would do is go to forties for ONE set of eight, and then one set of twelve with
   * the thirty fives and one set of ten with the thirty fives." One set promoted; the rest keep real reps. */
  const p = legCurl(14, { min: 10, max: 14 });
  assert.equal(p.move, "stagger");
  assert.equal(p.next, "1 × 12 @ 140 lb, 1 × 14 @ 130 lb");
  assert.equal(p.nextSets!.length, 2, "two sets in, two sets out — no third set appears");
});

test("below the top of the band the reps climb and the weight holds", () => {
  const p = legCurl(12, { min: 10, max: 14 });
  assert.equal(p.move, "reps");
  assert.equal(p.next, "2 × 13 @ 130 lb");
});
