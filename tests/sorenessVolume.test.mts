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
import {
  applyRecoveryToNextWeek, describeRecoveryEdit, sorenessReadings, verdictForAnswer, volumeActionsForDay,
} from "../src/shared/sorenessVolume.ts";
import { isMajorLift } from "../src/shared/majorLift.ts";
import { sorenessWording } from "../src/data/mockData.ts";

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

test("a 5 on its own now means room for more", () => {
  /* This asserted "ambiguous" while a follow-up question existed to resolve it -- "healed at some point in
   * four days" covers both the on-target case and the healed-far-too-early case. Jack removed that
   * question: "there's too much feedback... let's remove that second button altogether."
   *
   * Ambiguous would therefore be the answer to every 5 forever, and volumeActionFor treats it as no change,
   * so soreness could only ever take volume AWAY. A one-way ratchet down across a block is a worse failure
   * than the imprecision. The guard moved to volumeActionFor, where it is stronger: two consecutive clear
   * readings to add a set, one bad reading to take one off. */
  assert.equal(verdictForAnswer({ severity: 5, lastTrainedDaysAgo: 4 }), "add-volume");
  assert.equal(verdictForAnswer({ severity: 4, lastTrainedDaysAgo: 4 }), "on-target");
  assert.equal(verdictForAnswer({ severity: 3, lastTrainedDaysAgo: 4 }), "on-target");
  assert.equal(verdictForAnswer({ severity: 2, lastTrainedDaysAgo: 4 }), "reduce-volume");
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

// --- the wire: the cut lands on the session that CAUSED the soreness -----------------------------------

/** Monday: heavy squat plus a leg extension. Friday: a different quad session. */
const monday = (id: string, date: string, soreness?: Answers) => ({
  ...day(id, date, soreness), code: "L1", dow: "Mon",
});
const friday = (id: string, date: string, soreness?: Answers) => {
  const d: any = day(id, date, soreness);
  d.code = "L2";
  d.dow = "Fri";
  d.exercises.e1.name = "Bulgarian Split Squat";
  d.exercises.e2.name = "Leg Curl";
  d.exercises.e2.muscle = "Quads";
  return d;
};
/** Next week's sessions have not been trained: nothing ticked, nothing logged. The rule refuses to rewrite
 * a session anyone has started, so a fixture that leaves them checked silently tests nothing. */
const upcoming = (d: any) => {
  const copy = structuredClone(d);
  for (const ex of Object.values<any>(copy.exercises)) {
    for (const s of ex.sets) {
      s.checked = false;
      s.actual = null;
      delete s.effort;
    }
  }
  copy.status = "visible";
  delete copy.feedbackDone;
  return copy;
};

const twoWeeks = (w1: any[], w2: any[]) => ({
  name: "P", totalWeeks: 6, coachName: "",
  weeks: [
    { number: 2, phase: "accumulation", days: w1 },
    { number: 3, phase: "accumulation", days: w2.map(upcoming) },
  ],
}) as never;

const setsOf = (p: any, dayId: string, name: string) => {
  const d = p.weeks.flatMap((w: any) => w.days).find((x: any) => x.id === dayId);
  const ex = Object.values(d.exercises).find((e: any) => e.name === name) as any;
  return ex.sets.filter((s: any) => !s.isWarmup && !s.removed);
};

test("still sore on Friday takes the set off next MONDAY, the session that caused it", () => {
  // Jack: "your Monday session volume would be reduced, because the Monday session is the reason that
  // you're there on Friday getting ready to train and you're still sore."
  const p = twoWeeks(
    [monday("mon", "2026-09-14"), friday("fri", "2026-09-18", sore(2, 4))],
    [monday("mon2", "2026-09-21"), friday("fri2", "2026-09-25")],
  );
  const { program, edits } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);

  assert.equal(edits.length, 1);
  assert.equal(edits[0].causedBy, "mon", "Monday did the damage");
  assert.equal(edits[0].target, "mon2", "so next Monday is what changes");
  assert.equal(edits[0].exercise, "Leg Extension", "and it comes off the accessory, not the squat");

  assert.equal(setsOf(program, "mon2", "Leg Extension").length, 2, "three became two");
  assert.equal(setsOf(program, "mon2", "Barbell Squat").length, 3, "the major lift keeps its sets");
  assert.equal(setsOf(program, "fri2", "Leg Curl").length, 3, "next Friday is untouched");
});

test("the whole muscle goes back to the weights it actually lifted in that session", () => {
  const p: any = twoWeeks(
    [monday("mon", "2026-09-14"), friday("fri", "2026-09-18", sore(1, 4))],
    [monday("mon2", "2026-09-21"), friday("fri2", "2026-09-25")],
  );
  // Next Monday had already been programmed upward before Friday's answer existed.
  for (const name of ["Barbell Squat", "Leg Extension"]) {
    for (const s of setsOf(p, "mon2", name)) s.prescribed.load = 999;
  }
  const { program } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);
  assert.ok(setsOf(program, "mon2", "Barbell Squat").every((s: any) => s.prescribed.load === 225), "squat back to 225");
  assert.ok(setsOf(program, "mon2", "Leg Extension").every((s: any) => s.prescribed.load === 90), "extension back to 90");
});

test("a session already started is never rewritten", () => {
  const p: any = twoWeeks(
    [monday("mon", "2026-09-14"), friday("fri", "2026-09-18", sore(2, 4))],
    [monday("mon2", "2026-09-21"), friday("fri2", "2026-09-25")],
  );
  setsOf(p, "mon2", "Barbell Squat")[0].checked = true;
  const { program, edits } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);
  assert.equal(edits.length, 0);
  assert.equal(program, p, "the same program comes back, untouched");
});

test("recovering early adds the set to an accessory, never to the heavy lift", () => {
  // Jack: "you're already milking out as much stimulus as you can early on in the session from those
  // heavier lifts. That's why they're there in the first place, as priorities."
  const p = twoWeeks(
    [monday("mon", "2026-09-10", healedOn(1, 4)), friday("fri", "2026-09-14", healedOn(1, 4))],
    [monday("mon2", "2026-09-17"), friday("fri2", "2026-09-21")],
  );
  const { program, edits } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);
  assert.equal(edits[0]?.sets, 1);
  assert.equal(edits[0].exercise, "Leg Extension");
  assert.equal(setsOf(program, "mon2", "Leg Extension").length, 4);
  assert.equal(setsOf(program, "mon2", "Barbell Squat").length, 3, "the squat is not where volume is added");
});

test("only 'Very sore' and 'Sore' pull volume back — slightly sore is left alone", () => {
  // Jack: "sometimes you're a little bit more sore in the first week of a block... maybe 90%, 95% healed on
  // a day, which isn't too big of a deal. So that's why I would only pull volume back if somebody submits
  // still sore."
  for (const [severity, expected] of [[1, 1], [2, 1], [3, 0], [4, 0]] as const) {
    const p = twoWeeks(
      [monday("mon", "2026-09-14"), friday("fri", "2026-09-18", sore(severity, 4))],
      [monday("mon2", "2026-09-21"), friday("fri2", "2026-09-25")],
    );
    const { edits } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);
    assert.equal(edits.length, expected, `severity ${severity} (${sorenessWording[severity - 1]})`);
  }
});

test("a muscle whose every slot is a major lift holds its weight and keeps its sets", () => {
  const p: any = twoWeeks(
    [monday("mon", "2026-09-14"), friday("fri", "2026-09-18", sore(2, 4))],
    [monday("mon2", "2026-09-21"), friday("fri2", "2026-09-25")],
  );
  for (const id of ["mon", "mon2"]) {
    const d = p.weeks.flatMap((w: any) => w.days).find((x: any) => x.id === id);
    d.exercises.e2.name = "Hack Squat Machine";
  }
  for (const s of setsOf(p, "mon2", "Hack Squat Machine")) s.prescribed.load = 999;
  const { program, edits } = applyRecoveryToNextWeek(p, "fri", isMajorLift, (d) => d.label);
  assert.equal(edits[0].exercise, null, "there is no accessory to take it off");
  assert.equal(edits[0].sets, 0);
  assert.equal(setsOf(program, "mon2", "Hack Squat Machine").length, 3, "no set is dropped");
  assert.ok(setsOf(program, "mon2", "Hack Squat Machine").every((s: any) => s.prescribed.load === 90), "but the weight still holds");
  assert.match(describeRecoveryEdit(edits[0]), /no set comes off/);
});
