/** When the soreness check is asked at all.
 *
 * One rule: only muscles today is about to train, and only once they come round again. Asking whether
 * someone's back has healed on a day they are not training back produces information nobody can act on.
 *
 * There used to be a second rule — never in week 0 or week 1 — and it is gone. It was an earlier session's
 * reasoning, never Jack's, and it suppressed the entire check: he trained biceps on the Monday and Wednesday
 * of week 1 and was asked nothing. "I was supposed to receive a prompt asking me if my biceps were healed…
 * because I trained them on Monday and I trained them today." The test that pinned the old rule is replaced
 * below by one that reproduces his week exactly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSorenessDue } from "../src/shared/soreness.ts";
import type { Program } from "../src/data/types.ts";

function day(id: string, date: string, muscle: string, status: "done" | "upcoming", name = `${muscle} thing`) {
  return {
    id, date, status, name: id, kicker: "",
    exercises: { e1: { id: "e1", name, muscle, sets: [], metaLine: "" } },
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

test("asks in week 0 and week 1 too — Jack's week, reproduced", () => {
  // Hammer curls on the Monday of week 1, reverse curls on the Wednesday. He was asked nothing, because a
  // week gate suppressed the whole check. He expected both of these.
  for (const n of [0, 1]) {
    const p = program([
      {
        number: n,
        days: [
          day("mon", "2026-09-14", "Biceps", "done", "Hammer Curl"),
          day("wed", "2026-09-16", "Forearms", "upcoming", "Dumbbell Reverse Curl"),
        ],
      },
    ]);
    const due = computeSorenessDue(p, "wed");
    const asked = due.map((d) => d.muscle);
    assert.ok(asked.includes("Biceps"), `week ${n}: biceps should be asked, got [${asked.join(", ")}]`);
    // This one needs the hammer-curl synergist as well as the gate being gone: a hammer curl is tagged
    // biceps, and nothing linked it to forearm work until it was matched by name.
    assert.ok(asked.includes("Forearms"), `week ${n}: forearms should be asked, got [${asked.join(", ")}]`);
    assert.equal(due.find((d) => d.muscle === "Biceps")!.lastTrainedDaysAgo, 2);
  }
});

test("a curl that is not a hammer curl does not count as forearm work", () => {
  // The reason the link is by exercise name rather than "biceps -> forearms" for every curl: a spider curl
  // barely touches brachioradialis, and asking about forearms after one would be noise.
  const p = program([
    {
      number: 2,
      days: [
        day("mon", "2026-09-14", "Biceps", "done", "Spider Curl"),
        day("wed", "2026-09-16", "Forearms", "upcoming", "Dumbbell Reverse Curl"),
      ],
    },
  ]);
  const asked = computeSorenessDue(p, "wed").map((d) => d.muscle);
  assert.ok(!asked.includes("Forearms"), `forearms should not be asked after spider curls, got [${asked.join(", ")}]`);
  assert.ok(asked.includes("Biceps"), "biceps still should be — a reverse curl works them");
});

test("a muscle never trained before is not asked about", () => {
  const p = program([{ number: 3, days: [day("b", "2026-09-12", "Back", "upcoming")] }]);
  assert.deepEqual(computeSorenessDue(p, "b"), []);
});
