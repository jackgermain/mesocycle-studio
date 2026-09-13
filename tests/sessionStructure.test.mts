import { test } from "node:test";
import assert from "node:assert/strict";
import { planWeek, type WeekPlan } from "../src/generator/sessionStructure";
import { REGION_OF } from "../src/generator/patterns";

/** Does the generator write the programs Jack actually writes?
 *
 * Seventy-two of his templates were read into doctrine as G101-G116. Nothing checked them against the
 * generator, so every mismatch found there was prose in a file that no code had to obey. These are those
 * rules as assertions.
 *
 * Several of them fail today. Those carry `todo` with the reason, so the suite stays honest without turning
 * CI red for defects that were already there -- a todo prints as a known gap rather than a regression. Fixing
 * the generator means deleting the todo flag, not writing a new test.
 */

const LEG_MUSCLES = new Set(["Quads", "Hamstrings", "Glutes", "Calves", "Adductors"]);
const SMALL_MUSCLES = new Set(["Abs", "Obliques", "Calves", "Forearms"]);

function plan(days: number, profile: "glute-priority" | "upper-priority"): WeekPlan {
  const w = planWeek(days, { profile });
  assert.ok(w, `planWeek(${days}, ${profile}) returned nothing`);
  return w;
}

/** The region a day opens on, from its lead slot's pattern. */
function leadRegion(day: WeekPlan[number]): string {
  const lead = day.find((s) => s.role === "lead");
  return lead?.pattern ? REGION_OF[lead.pattern] : "none";
}

/** Every muscle a day touches, from both the compound patterns and the named accessory slots. */
function musclesIn(day: WeekPlan[number]): string[] {
  const out: string[] = [];
  for (const s of day) {
    if (s.muscle) out.push(s.muscle);
    if (s.pattern) {
      const r = REGION_OF[s.pattern];
      if (r === "legs") out.push("Quads");
    }
  }
  return out;
}

function dayHasLegs(day: WeekPlan[number]): boolean {
  return musclesIn(day).some((m) => LEG_MUSCLES.has(m));
}

// ---- G107: the female lead rotation is legs-dominant at every frequency ----

test("G107: a 5-day glute-priority week leads with legs on at least 3 days", { todo: "gives 2; his templates give 3-5" }, () => {
  const legLeads = plan(5, "glute-priority").filter((d) => leadRegion(d) === "legs").length;
  assert.ok(legLeads >= 3, `only ${legLeads} of 5 days lead with legs`);
});

test("G107: a 2-day glute-priority week leads with legs on both days", { todo: "gives 1; all four of his 2-day templates lead legs twice" }, () => {
  const legLeads = plan(2, "glute-priority").filter((d) => leadRegion(d) === "legs").length;
  assert.equal(legLeads, 2, `only ${legLeads} of 2 days lead with legs`);
});

test("G107: a 3-day glute-priority week leads with legs on at least 2 days", () => {
  const legLeads = plan(3, "glute-priority").filter((d) => leadRegion(d) === "legs").length;
  assert.ok(legLeads >= 2, `only ${legLeads} of 3 days lead with legs`);
});

// ---- Observed across all 72: no training day is empty of leg work ---------

test("no glute-priority day is empty of leg work", { todo: "planWeek(5) produces a day with none; that happens in none of his 72" }, () => {
  for (const days of [2, 3, 4, 5, 6]) {
    plan(days, "glute-priority").forEach((day, i) => {
      assert.ok(dayHasLegs(day), `${days}-day week: day ${i + 1} has no leg work`);
    });
  }
});

// ---- Observed across all 72: abs or calves appear somewhere in the week ----

test("a week schedules abs or calves somewhere", { todo: "finisher slots take whatever the budget has left, so small muscles are never scheduled" }, () => {
  for (const days of [2, 3, 4, 5, 6]) {
    for (const profile of ["glute-priority", "upper-priority"] as const) {
      const found = plan(days, profile).flatMap(musclesIn).some((m) => SMALL_MUSCLES.has(m));
      assert.ok(found, `${days}-day ${profile} week schedules no abs and no calves`);
    }
  }
});

// ---- G104/G109: the emphasised muscle leads, it does not finish -----------

test("G104: glutes never occupy a finisher slot in a glute-priority week", { todo: "they do, on days 1 and 4 of the 5-day week" }, () => {
  for (const days of [2, 3, 4, 5, 6]) {
    plan(days, "glute-priority").forEach((day, i) => {
      const finisherMuscles = day.filter((s) => s.role === "finisher").map((s) => s.muscle);
      assert.ok(
        !finisherMuscles.includes("Glutes"),
        `${days}-day week, day ${i + 1}: Glutes is in a finisher slot of a GLUTE-priority program`,
      );
    });
  }
});

test("a big muscle never occupies a finisher slot", { todo: "Quads and Hamstrings land there too" }, () => {
  const big = new Set(["Quads", "Hamstrings", "Glutes", "Chest", "Back"]);
  for (const days of [2, 3, 4, 5, 6]) {
    for (const profile of ["glute-priority", "upper-priority"] as const) {
      plan(days, profile).forEach((day, i) => {
        for (const s of day.filter((x) => x.role === "finisher")) {
          assert.ok(!big.has(s.muscle ?? ""), `${days}-day ${profile}, day ${i + 1}: ${s.muscle} is a finisher`);
        }
      });
    }
  }
});

// ---- G111: a four-day week is two session types run twice -----------------

test("G111: a 4-day week repeats two session types, A B A B", { todo: "gives four distinct leads; his ten 4-day templates all repeat two" }, () => {
  for (const profile of ["glute-priority", "upper-priority"] as const) {
    const leads = plan(4, profile).map(leadRegion);
    assert.equal(leads[0], leads[2], `${profile}: day 1 leads ${leads[0]}, day 3 leads ${leads[2]}`);
    assert.equal(leads[1], leads[3], `${profile}: day 2 leads ${leads[1]}, day 4 leads ${leads[3]}`);
  }
});

// ---- Sanity: the planner answers at all, at every frequency ---------------

test("planWeek answers at every frequency it claims to support", () => {
  for (const days of [2, 3, 4, 5, 6]) {
    for (const profile of ["glute-priority", "upper-priority"] as const) {
      const w = plan(days, profile);
      assert.equal(w.length, days, `${days}-day ${profile} produced ${w.length} days`);
      for (const day of w) assert.ok(day.length >= 3, "a session with fewer than three slots");
    }
  }
});
