/** Turning a draft into a real dated program.
 *
 * Week 0 is the subtle part: weekly patterns are authored as if day 1 were Monday, but a program starts
 * on whatever day someone presses go, so anything that would land before today has to be dropped rather
 * than scheduled in the past. Getting this wrong shows up as a workout dated last Tuesday. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProgramFromDraft, draftDaysFromProgram, dowsFromProgram, appendWeeks } from "../src/shared/programConvert.ts";
import type { DraftDay } from "../src/shared/programConvert.ts";

const DRAFT: DraftDay[] = [
  { name: "Upper", exercises: [{ name: "Incline Dumbbell Press", muscle: "Chest", sets: 4, reps: 8 }] },
  { name: "Lower", exercises: [{ name: "Smith Machine Squat", muscle: "Quads", sets: 4, reps: 10 }] },
];

function allDays(p: ReturnType<typeof buildProgramFromDraft>) {
  return p.weeks.flatMap((w) => w.days);
}

test("a draft becomes the requested number of weeks", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 4, "Jack");
  assert.equal(p.name, "Block A");
  assert.equal(p.totalWeeks, 4);
  assert.ok(p.weeks.length >= 4, "expected at least the requested weeks");
});

test("no session is ever scheduled before today", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 4, "Jack");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const d of allDays(p)) {
    if (!d.date) continue;
    assert.ok(new Date(d.date).getTime() >= today.getTime(), `${d.name} is dated ${d.date}, in the past`);
  }
});

test("every day carries the exercises it was drafted with", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 2, "Jack");
  const names = new Set(allDays(p).flatMap((d) => d.order.map((id) => d.exercises[id]?.name)));
  assert.ok(names.has("Incline Dumbbell Press"));
  assert.ok(names.has("Smith Machine Squat"));
});

test("the drafted sets and reps survive the round trip", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 1, "Jack");
  const back = draftDaysFromProgram(p);
  const press = back.flatMap((d) => d.exercises).find((e) => e.name === "Incline Dumbbell Press");
  assert.ok(press, "the exercise did not come back out");
  assert.equal(press.sets, 4);
  assert.equal(press.reps, 8);
});

test("a two-day draft produces two distinct training days a week", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 3, "Jack");
  assert.equal(dowsFromProgram(p).length, 2);
});

test("appendWeeks extends without disturbing what is already there", () => {
  const p = buildProgramFromDraft("Block A", DRAFT, 2, "Jack");
  const beforeCount = p.weeks.length;
  const firstWeekDays = p.weeks[0].days.map((d) => d.name).join("|");
  const longer = appendWeeks(p, 2);
  assert.equal(longer.weeks.length, beforeCount + 2);
  assert.equal(longer.weeks[0].days.map((d) => d.name).join("|"), firstWeekDays, "week 1 changed");
});

test("an empty draft does not throw", () => {
  const p = buildProgramFromDraft("Empty", [], 4, "Jack");
  assert.ok(p, "building from nothing should still produce a program");
});
