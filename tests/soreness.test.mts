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

test("synergists are NOT asked about — only what is on the card today", () => {
  /* This test used to assert the opposite, on the reasoning that a back day works biceps whether or not the
   * program says biceps. The reasoning is fine; applying it to the QUESTION LIST was not. One chest
   * exercise asked about chest, triceps and front delts; one back exercise asked about back, biceps, rear
   * delts and forearms. Jack, on a Day 3 asking after eight muscles:
   *
   *   "For the love of God, if I have to remind you one more time to not ask me for soreness feedback on a
   *    day that I'm not training the body part I'm gonna crash out... there's no chest training, no triceps."
   *
   * The table is an inference of mine. An inference does not get to invent a question. */
  const p = program([
    { number: 2, days: [day("tue", "2026-09-08", "Back", "done"), day("sat", "2026-09-12", "Back", "upcoming")] },
  ]);
  const asked = computeSorenessDue(p, "sat").map((d) => d.muscle);
  assert.deepEqual(asked, ["Back"], "a back day asks about back, and nothing else");
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
    /* Wednesday's reverse curls are tagged Forearms, so Forearms is what gets asked — and it only counts as
     * a REPEAT because Monday's hammer curls are credited with forearm work by name. That is the synergist
     * table doing its job on the side it belongs on: the history, never the question list. His words were
     * "hammer curls on Monday and reverse curls work similar muscle groups", and the tissue they actually
     * share is the forearm, not the biceps. */
    assert.deepEqual(asked, ["Forearms"], `week ${n}: got [${asked.join(", ")}]`);
    assert.equal(due.find((d) => d.muscle === "Forearms")!.lastTrainedDaysAgo, 2);
  }
});

test("training a muscle directly twice in a week is always asked about — his original complaint", () => {
  // "Today I trained biceps for the second time this week, and I was not prompted a question this morning."
  // Direct both times, so the narrowed rule still catches it.
  const p = program([
    {
      number: 1,
      days: [
        day("mon", "2026-09-14", "Biceps", "done", "Hammer Curl"),
        day("wed", "2026-09-16", "Biceps", "upcoming", "Dumbbell Curl"),
      ],
    },
  ]);
  const due = computeSorenessDue(p, "wed");
  assert.deepEqual(due.map((d) => d.muscle), ["Biceps"]);
  assert.equal(due[0].lastTrainedDaysAgo, 2);
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
  // Wednesday is a reverse-curl day, so Forearms is the only thing on the card — but a spider curl on
  // Monday is not forearm work, so there is no earlier session to compare against and nothing is asked.
  assert.deepEqual(computeSorenessDue(p, "wed"), []);
});

test("a muscle never trained before is not asked about", () => {
  const p = program([{ number: 3, days: [day("b", "2026-09-12", "Back", "upcoming")] }]);
  assert.deepEqual(computeSorenessDue(p, "b"), []);
});

test("a category is never asked about, and its inferred expansion is not either", () => {
  /* Jack, shown "FULL BODY — LAST TRAINED 7 DAYS AGO" with a 1-5 soreness scale under it: "Remove feedback
   * for full body." There is no full-body soreness on a 1-5 scale, and no volume rule could act on the
   * answer -- a cut takes one set off one exercise for one muscle.
   *
   * It is the library's bucket for the olympic lifts AND the default for every cardio entry, so without
   * this a bike ride asks whether your full body has recovered. */
  const p = program([
    { number: 1, days: [day("w1", "2026-09-14", "Full body", "done", "Hip Clean")] },
    { number: 2, days: [day("w2", "2026-09-21", "Full body", "upcoming", "Hip Clean")] },
  ]);
  // Nothing is asked: the only tag on the movement is a category, and the table's guess at what a clean
  // fatigues is an inference, which no longer reaches the question list.
  assert.deepEqual(computeSorenessDue(p, "w2"), []);
});

test("cardio does not ask whether your full body has healed", () => {
  const p = program([
    { number: 1, days: [day("w1", "2026-09-14", "Full body", "done", "Stationary Bike")] },
    { number: 2, days: [day("w2", "2026-09-16", "Full body", "upcoming", "Stationary Bike")] },
  ]);
  assert.ok(!computeSorenessDue(p, "w2").some((d) => d.muscle === "Full body"));
});

test("a muscle only tagged as a SECONDARY on today's exercises is never asked about", () => {
  /* Fourth report of the same thing: "You're only supposed to ask about soreness for that muscle the same
   * day that you're supposed to train it again. I'm not training chest again until Friday, so I should not
   * be asked about soreness until then. This goes for every single body part."
   *
   * The set had been narrowed from the synergist table to "primary plus the exercise's own secondaryMuscles"
   * on the reasoning that those tags are his. They are — but a movement tagged "also hits chest" is still
   * not a chest day, and chest kept appearing on days he was not benching. Primary mover only. */
  const dipDay = day("w3d3", "2026-09-30", "Triceps", "upcoming", "Weighted Dip");
  (dipDay as unknown as { exercises: Record<string, { secondaryMuscles: string[] }> })
    .exercises.e1.secondaryMuscles = ["Chest", "Front delts"];
  const p = program([
    { number: 2, days: [day("w2", "2026-09-23", "Chest", "done", "Barbell Bench Press")] },
    { number: 3, days: [day("w3", "2026-09-28", "Triceps", "done", "Tricep Rope Pushdown"), dipDay] },
  ]);
  const asked = computeSorenessDue(p, "w3d3").map((d) => d.muscle);
  assert.ok(!asked.includes("Chest"), `chest is not trained today, got [${asked.join(", ")}]`);
  assert.ok(!asked.includes("Front delts"), `nor are front delts, got [${asked.join(", ")}]`);
  assert.deepEqual(asked, ["Triceps"], "the primary mover, and only that");
});

test("a day label is not a muscle — Upper and Lower are never asked about", () => {
  /* His custom exercises carry day labels as their muscle, so the check asked "UPPER — last trained 7 days
   * ago" with a 1-5 soreness scale under it. Jack: "I should not be being asked about upper or lower. The
   * feedback should only be for individual muscle parts."
   *
   * The guard is a WHITELIST of the library's real muscle groups, not a list of bad tags. The blacklist
   * version held one entry, "Full body", and the next junk tag got through — listing them one at a time
   * means waiting for him to find each one. */
  const p = program([
    { number: 2, days: [day("w2", "2026-09-23", "Upper", "done", "Push Day A")] },
    { number: 3, days: [day("w3", "2026-09-30", "Upper", "upcoming", "Push Day A")] },
  ]);
  assert.deepEqual(computeSorenessDue(p, "w3"), []);
});

test("every real muscle group still asks, so the whitelist cannot quietly mute one", () => {
  // The failure mode of a whitelist is the opposite of a blacklist's: a muscle missing from it disappears
  // silently. This pins that the 16 askable groups all still produce a question.
  for (const muscle of ["Chest", "Back", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves",
                        "Abs", "Obliques", "Forearms", "Traps", "Front delts", "Side delts", "Rear delts",
                        "Adductors"]) {
    const p = program([
      { number: 2, days: [day("a", "2026-09-23", muscle, "done")] },
      { number: 3, days: [day("b", "2026-09-26", muscle, "upcoming")] },
    ]);
    assert.deepEqual(computeSorenessDue(p, "b").map((d) => d.muscle), [muscle], muscle);
  }
});
