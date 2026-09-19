/** Soreness changing next week's volume.
 *
 * The engine in generator/recoveryWindow.ts was written, documented and tested with nothing calling it, so
 * for months every soreness answer anyone gave changed nothing about their training. These tests pin the
 * wire: that a verdict reaches the proposed set count, that it reaches it once, and that it never touches
 * the weight. A regression here is silent in the worst way -- the question still gets asked, the answer
 * still lands on the desk, and the numbers quietly stop listening to it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sorenessReadings, verdictForAnswer, volumeActionsForDay } from "../src/shared/sorenessVolume.ts";
import { proposalsForDay } from "../src/shared/progressionProposal.ts";

type Answers = Record<string, { severity: number; lastTrainedDaysAgo: number; recoveredOnDay?: number }>;

/** A lower day: two quad exercises in order, plus a timed plank the proposer skips. */
function day(id: string, date: string, soreness?: Answers, extra: Record<string, unknown> = {}) {
  const set = (i: number, load: number, o: Record<string, unknown> = {}) => ({
    id: `${id}-s${i}`, index: i, type: "straight", checked: true, actual: { reps: 10, load },
    prescribed: { reps: 10, load, effort: { scale: "RIR", value: 2 }, restSec: 90 }, ...o,
  });
  return {
    id, code: "L1", label: "Lower", dow: "Mon", date, status: "done", muscleSummary: "", setCount: 6,
    order: ["e1", "e2"],
    exercises: {
      // First quad slot, heaviest -- where a swap recommendation belongs.
      e1: {
        id: "e1", name: "Barbell Squat", muscle: "Quads", metaLine: "", hasVideo: false, equipment: "barbell",
        sets: [set(0, 225), set(1, 225), set(2, 225, { effort: 4 })],
      },
      // Last quad slot -- where a set comes off or goes on.
      e2: {
        id: "e2", name: "Leg Extension", muscle: "Quads", metaLine: "", hasVideo: false, equipment: "machine",
        sets: [set(0, 90), set(1, 90), set(2, 90, { effort: 4 })],
      },
    },
    feedbackDone: true,
    ...(soreness ? { sorenessAnswers: soreness } : {}),
    ...extra,
  };
}

const program = (...days: ReturnType<typeof day>[]) => ({
  name: "P", totalWeeks: 6, coachName: "",
  weeks: [{ number: 2, phase: "accumulation", days }],
}) as never;

const sore = (sev: number, gap = 4): Answers => ({ Quads: { severity: sev, lastTrainedDaysAgo: gap } });
const healedOn = (d: number, gap = 4): Answers => ({ Quads: { severity: 5, lastTrainedDaysAgo: gap, recoveredOnDay: d } });

const forDay = (p: never, id: string) => proposalsForDay(p, id, "lb")!.proposals;
const named = (p: never, id: string, name: string) => forDay(p, id).find((x) => x.exercise === name)!;

// --- reading one answer -------------------------------------------------------------------------------

test("still sore on the day it comes round again is the one unambiguous reading", () => {
  assert.equal(verdictForAnswer({ severity: 2, lastTrainedDaysAgo: 4 }), "reduce-volume");
  assert.equal(verdictForAnswer({ severity: 1, lastTrainedDaysAgo: 3 }), "reduce-volume");
});

test("healing the day before the next session is the target", () => {
  // A 4-day gap should finish healing on day 3.
  assert.equal(verdictForAnswer({ severity: 5, lastTrainedDaysAgo: 4, recoveredOnDay: 3 }), "on-target");
});

test("healing early, or never getting sore at all, is a day of growth left unbought", () => {
  assert.equal(verdictForAnswer({ severity: 5, lastTrainedDaysAgo: 4, recoveredOnDay: 1 }), "add-volume");
  assert.equal(verdictForAnswer({ severity: 5, lastTrainedDaysAgo: 4, recoveredOnDay: 0 }), "add-volume");
});

test("a 5 with no when is honestly ambiguous, not an invitation to add volume", () => {
  // Answers saved before the follow-up question existed. "Healed at some point in four days" covers both
  // the target case and the healed-far-too-early case, and one reading cannot separate them.
  assert.equal(verdictForAnswer({ severity: 5, lastTrainedDaysAgo: 4 }), "ambiguous");
});

// --- history ------------------------------------------------------------------------------------------

test("readings come back newest first, and stop at the session being proposed from", () => {
  const p = program(
    day("d1", "2026-09-07", sore(2)),
    day("d2", "2026-09-10", healedOn(1)),
    day("d3", "2026-09-14", sore(1)),
  );
  const upto = sorenessReadings(p, "d2").get("Quads")!;
  assert.deepEqual(upto.map((r) => r.dayId), ["d2", "d1"], "the later session is not visible yet");
  assert.deepEqual(upto.map((r) => r.verdict), ["add-volume", "reduce-volume"]);
});

test("a reading is only spent by the session it was taken at", () => {
  // computeSorenessDue stops asking after ten days, so a muscle can be trained on a day the check never
  // asked about. Without this rule that day would re-spend the previous reading and cut the same muscle
  // twice for one bad week.
  const p = program(day("d1", "2026-09-07", sore(2)), day("d2", "2026-09-10"));
  assert.equal(volumeActionsForDay(p, "d1").get("Quads")?.sets, -1);
  assert.equal(volumeActionsForDay(p, "d2").get("Quads"), undefined, "d2 asked nothing, so it changes nothing");
});

// --- the wire ----------------------------------------------------------------------------------------

test("still sore takes one set off the muscle, not one off every exercise", () => {
  const p = program(day("d1", "2026-09-10", sore(2)));
  const squat = named(p, "d1", "Barbell Squat");
  const ext = named(p, "d1", "Leg Extension");
  assert.equal(ext.nextSets!.length, 2, "three sets became two");
  assert.ok(ext.label.includes("−1 set"), ext.label);
  assert.match(ext.why, /Still sore at the next session/);
  assert.equal(squat.nextSets!.length, 3, "only one set comes off the muscle, not one per exercise");
});

test("a still-sore muscle repeats last week's weight, whatever the load rule wanted", () => {
  // Jack: "keep the load the same when a muscle is still sore." An easy top set would normally add weight;
  // a muscle that arrived unhealed is not a muscle to put more weight on, so recovery overrules it.
  const easy = day("d1", "2026-09-10", sore(2));
  easy.exercises.e2.sets[2].effort = 2; // rated 2 -- G62 would move every set up a step

  const alone = { ...easy, sorenessAnswers: undefined } as unknown as ReturnType<typeof day>;
  const unchecked = named(program(alone), "d1", "Leg Extension");
  assert.equal(unchecked.move, "load", "without the soreness reading this exercise adds weight");
  assert.ok(unchecked.nextSets!.every((s) => s.load! > 90), unchecked.next);

  const ext = named(program(easy), "d1", "Leg Extension");
  assert.equal(ext.move, "hold");
  assert.ok(ext.nextSets!.every((s) => s.load === 90), `last week's weight, got ${ext.next}`);
  assert.deepEqual(ext.nextSets!.map((s) => s.reps), [10, 10], "and last week's reps");
  assert.match(ext.why, /The weight holds where it is/);
});

test("one early reading holds; two running add a set", () => {
  const once = program(day("d1", "2026-09-10", healedOn(1)));
  assert.equal(named(once, "d1", "Leg Extension").nextSets!.length, 3, "one reading is noise");

  const twice = program(day("d0", "2026-09-06", healedOn(1)), day("d1", "2026-09-10", healedOn(1)));
  const ext = named(twice, "d1", "Leg Extension");
  assert.equal(ext.nextSets!.length, 4);
  assert.ok(ext.label.includes("+1 set"), ext.label);
  assert.match(ext.why, /Add a set/);
});

test("three unhealed in a row asks for a different movement, in the heaviest slot", () => {
  const p = program(
    day("d0", "2026-09-03", sore(2)),
    day("d1", "2026-09-07", sore(2)),
    day("d2", "2026-09-10", sore(1)),
  );
  const squat = named(p, "d2", "Barbell Squat");
  const ext = named(p, "d2", "Leg Extension");
  assert.match(squat.why, /different loading profile/, "the tendon complaint is about the heavy slot");
  assert.equal(squat.nextSets!.length, 3, "the swap note changes no numbers");
  assert.equal(ext.nextSets!.length, 2, "and a set still comes off the last slot");
  assert.ok(!/different loading profile/.test(ext.why), "the recommendation is not repeated on both");
});

test("recovery on target leaves the volume exactly where it is", () => {
  const p = program(day("d1", "2026-09-10", healedOn(3)));
  assert.equal(named(p, "d1", "Leg Extension").nextSets!.length, 3);
  assert.ok(!/Soreness:/.test(named(p, "d1", "Leg Extension").why));
});

test("a deload week is never cut further, and a finished block is never touched", () => {
  // C7a only schedules a deload at five or more sessions a week, so the week has to really hold five.
  const filler = ["2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09"].map((d, i) => day(`f${i}`, d));
  const deload = {
    name: "P", totalWeeks: 5, coachName: "",
    weeks: [{ number: 4, phase: "accumulation", days: [...filler, day("d1", "2026-09-10", sore(2))] }],
  } as never;
  // Week 4 of 5: next week is the deload, which has already halved the sets.
  const d = proposalsForDay(deload, "d1", "lb")!.proposals.find((x) => x.exercise === "Leg Extension")!;
  assert.equal(d.move, "deload");
  assert.equal(d.nextSets!.length, 2, "C7a's half, not half minus one");

  const finished = {
    name: "P", totalWeeks: 2, coachName: "",
    weeks: [{ number: 2, phase: "accumulation", days: [day("d1", "2026-09-10", sore(2))] }],
  } as never;
  const f = proposalsForDay(finished, "d1", "lb")!.proposals.find((x) => x.exercise === "Leg Extension")!;
  assert.equal(f.move, "finished");
  assert.equal(f.nextSets!.length, 3, "nothing is written past the end of a block");
});

test("a set never comes off a major lift, even when it is the only place left", () => {
  // Jack: "I wouldn't take a set away from a major exercise. No matter what. I would take it away from one
  // of the smaller accessories." Both slots here are squats, so nothing is dropped -- but the weight still
  // holds, which on its own is a real reduction in what the session asks for.
  const compoundsOnly = day("d1", "2026-09-10", sore(2));
  compoundsOnly.exercises.e2.name = "Hack Squat Machine";
  const p = program(compoundsOnly);
  for (const name of ["Barbell Squat", "Hack Squat Machine"]) {
    const ex = named(p, "d1", name);
    assert.equal(ex.nextSets!.length, 3, `${name} keeps its sets`);
    assert.equal(ex.move, "hold");
    assert.match(ex.why, /Every Quads movement here is a major lift/);
  }
});

test("the cut skips past a major lift to reach the accessory behind it", () => {
  // The old rule was "the muscle's last slot", which here would have taken a set off the leg press.
  const withPress = day("d1", "2026-09-10", sore(2));
  withPress.order = ["e1", "e2", "e3"];
  withPress.exercises.e3 = { ...withPress.exercises.e1, id: "e3", name: "Leg Press — 45°" };
  const p = program(withPress);
  assert.equal(named(p, "d1", "Leg Press — 45°").nextSets!.length, 3, "the last slot is a major lift");
  assert.equal(named(p, "d1", "Leg Extension").nextSets!.length, 2, "so the set comes off the accessory");
  assert.match(named(p, "d1", "Leg Press — 45°").why, /set comes off Leg Extension/);
});

test("a muscle already down to one set still holds the weight, and says why", () => {
  const one = day("d1", "2026-09-10", sore(2));
  one.exercises.e2.sets = [{ ...one.exercises.e2.sets[2], effort: 2 }];
  const ext = named(program(one), "d1", "Leg Extension");
  assert.equal(ext.nextSets!.length, 1);
  assert.equal(ext.nextSets![0].load, 90, "no set to take off, but the weight still does not move");
  assert.match(ext.why, /Already down to one set/);
});
