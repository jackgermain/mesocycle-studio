import { test } from "node:test";
import assert from "node:assert/strict";
import { planWeek } from "../src/generator/sessionStructure";
import { selectForWeek } from "../src/generator/select";
import { weekToDraftDays, unfilledPositions, UNFILLED_NAME } from "../src/generator/toDraft";
import { buildProgramFromDraft } from "../src/shared/programConvert";

/** The generator existed in three layers and none of them was reachable from the app. This is the bridge to
 * the shape the CSV and AI importers already produce, so the proof that matters is end to end: plan a week,
 * fill it, convert it, and hand it to the converter the importers use. If a real Program comes out, the
 * pipeline can reach the app. */

function generate(days: number, profile: "glute-priority" | "upper-priority" = "glute-priority") {
  const week = planWeek(days, { profile, wants: ["Abs", "Calves"] });
  assert.ok(week, "planWeek returned nothing");
  return selectForWeek(week);
}

test("a planned week converts to one draft day per training day", () => {
  const draft = weekToDraftDays(generate(4));
  assert.equal(draft.length, 4);
  draft.forEach((day, i) => {
    assert.equal(day.name, `Day ${i + 1}`);
    assert.ok(day.exercises.length >= 3, `day ${i + 1} has ${day.exercises.length} exercises`);
  });
});

test("every drafted exercise carries a name, a muscle, sets and reps", () => {
  for (const day of weekToDraftDays(generate(5))) {
    for (const ex of day.exercises) {
      assert.ok(ex.name.length > 0, "an exercise came through unnamed");
      assert.ok((ex.muscle ?? "").length > 0, `${ex.name} has no muscle to book volume against`);
      assert.ok((ex.sets ?? 0) >= 2, `${ex.name} has ${ex.sets} sets`);
      assert.ok((ex.reps ?? 0) > 0, `${ex.name} has ${ex.reps} reps`);
    }
  }
});

test("the opening slot is heavier than the closing one", () => {
  // profileFor's shape: three sets at the front, two and high reps at the back.
  const day = weekToDraftDays(generate(3))[0];
  const first = day.exercises[0];
  const last = day.exercises[day.exercises.length - 1];
  assert.equal(first.sets, 3);
  assert.equal(last.sets, 2);
  assert.ok(last.reps! > first.reps!, `last ${last.reps} reps is not above first ${first.reps}`);
});

test("no load is invented", () => {
  // The generator knows the shape of the week, not what this person can lift.
  for (const day of weekToDraftDays(generate(4))) {
    for (const ex of day.exercises) assert.equal(ex.load, undefined, `${ex.name} arrived with a load`);
  }
});

test("a slot the equipment cannot cover becomes a visible placeholder, not a silent gap", () => {
  const week = planWeek(4, { profile: "upper-priority", wants: ["Abs", "Calves"] })!;
  const filled = selectForWeek(week, { equipment: new Set(["bodyweight"] as const) });
  const missing = unfilledPositions(filled);
  const draft = weekToDraftDays(filled);

  // Whatever bodyweight cannot cover must still appear as a slot, so the gap is reviewable.
  const totalSlots = draft.reduce((n, d) => n + d.exercises.length, 0);
  const planned = week.reduce((n, d) => n + d.length, 0);
  assert.equal(totalSlots, planned, "a slot was dropped rather than flagged");

  for (const { day, index } of missing) {
    assert.equal(draft[day].exercises[index].name, UNFILLED_NAME);
  }
});

test("end to end: the draft is something buildProgramFromDraft accepts", () => {
  const draft = weekToDraftDays(generate(4));
  const program = buildProgramFromDraft("Generated", draft, 4, "Jack");

  assert.equal(program.totalWeeks, 4);
  assert.ok(program.weeks.length > 0, "no weeks were built");
  const named = program.weeks
    .flatMap((w) => w.days)
    .flatMap((d) => Object.values(d.exercises ?? {}))
    .map((e) => (e as { name: string }).name);
  assert.ok(named.length > 0, "the program came out with no exercises in it");
  assert.ok(
    named.some((n) => n !== UNFILLED_NAME),
    "every exercise in the generated program is a placeholder",
  );
});
