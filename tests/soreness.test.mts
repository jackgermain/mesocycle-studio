/** When the soreness check is asked at all.
 *
 * Two rules, and both are about not asking a question whose answer means nothing:
 *
 *  - Only muscles today is about to train. Asking whether someone's back has healed on a day they are not
 *    training back produces information nobody can act on.
 *  - Not in week 0 or week 1. Both are sore by definition -- new movements, new order -- and soreness is a
 *    signal about whether volume is set too high, which needs a previous week of the same prescription to
 *    mean anything.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSorenessDue } from "../src/shared/soreness.ts";
import type { Program } from "../src/data/types.ts";

function day(id: string, date: string, muscle: string, status: "done" | "upcoming") {
  return {
    id, date, status, name: id, kicker: "",
    exercises: { e1: { id: "e1", name: `${muscle} thing`, muscle, sets: [], metaLine: "" } },
    order: ["e1"],
  } as unknown as Program["weeks"][number]["days"][number];
}
function program(weeks: { number: number; days: ReturnType<typeof day>[] }[]): Program {
  return { weeks: weeks.map((w) => ({ ...w, phase: "accumulation" as const })) } as unknown as Program;
}

test("asks only about a muscle today actually trains", () => {
  const p = program([
    { number: 2, days: [day("mon", "2026-09-07", "Back", "done"), day("wed", "2026-09-09", "Chest", "upcoming")] },
  ]);
  // Wednesday is a chest day; Monday's back work is not asked about.
  assert.deepEqual(computeSorenessDue(p, "wed"), []);
});

test("asks when the same muscle comes round again", () => {
  // Back on Tuesday, back again on Saturday — exactly Jack's example.
  const p = program([
    { number: 2, days: [day("tue", "2026-09-08", "Back", "done"), day("sat", "2026-09-12", "Back", "upcoming")] },
  ]);
  const due = computeSorenessDue(p, "sat");
  const back = due.find((d) => d.muscle === "Back");
  assert.ok(back, "back should be asked about on the next back day");
  assert.equal(back.lastTrainedDaysAgo, 4);
});

test("synergists come along, because they are trained again too", () => {
  // Back day works biceps whether or not the program says "biceps", and the previous back day worked them
  // as well — so they are a muscle being trained again and the question is a fair one. Documented here
  // because it looks like over-asking until you know it is the synergist table doing its job.
  const p = program([
    { number: 2, days: [day("tue", "2026-09-08", "Back", "done"), day("sat", "2026-09-12", "Back", "upcoming")] },
  ]);
  const asked = computeSorenessDue(p, "sat").map((d) => d.muscle);
  assert.ok(asked.includes("Biceps"), `expected biceps among ${asked.join(", ")}`);
});

test("never asks in week 0 or week 1", () => {
  for (const n of [0, 1]) {
    const p = program([
      { number: n, days: [day("a", "2026-09-08", "Back", "done"), day("b", "2026-09-12", "Back", "upcoming")] },
    ]);
    assert.deepEqual(computeSorenessDue(p, "b"), [], `week ${n} should ask nothing`);
  }
});

test("a muscle never trained before is not asked about", () => {
  const p = program([{ number: 3, days: [day("b", "2026-09-12", "Back", "upcoming")] }]);
  assert.deepEqual(computeSorenessDue(p, "b"), []);
});
