import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTemplate, WOMENS_TEMPLATE_SPECS, womensTemplates } from "../src/coach/womensTemplates";
import { BUILT_IN_TEMPLATES } from "../src/coach/builtInTemplates";
import { libraryExercises } from "../src/coach/exerciseLibrary";

/** Twenty-two hand-written templates are twenty-two chances to typo an exercise name.
 *
 * A name the library does not recognise does not crash: it takes muscle "General" and books its volume
 * against nothing, which is exactly how the importer turned "Deadlifts" into a Romanian deadlift and nobody
 * noticed. So the first and most important check here is that every name is real.
 *
 * The rest pin the doctrine these were written to, so a later edit cannot quietly drift off it. */

const LIBRARY = new Map(libraryExercises.map((e) => [e.name, e.muscle]));
const LEG = new Set(["Glutes", "Quads", "Hamstrings", "Adductors"]);
const templates = womensTemplates();

/** The emphases G107's leg-lead observations were actually drawn from.
 *
 * Every count in that rule came from templates that prioritise the lower body. Applying them to an
 * upper-emphasis or upper-specialty program asserts the opposite of G105, which records that one of his own
 * five-day templates never leads a day with legs at all. Three checks in this file made that mistake and
 * failed against templates that are correct. */
const LOWER_EMPHASIS_INTENT = new Set(["Glutes", "Lower Body"]);

test("the women's set covers every frequency", () => {
  // The original 22 matched the distribution of the batch Jack sent. The 17 gap-fill templates were written
  // to the 6 x 5 x 2 grid instead, so the shape is now "every frequency represented" rather than a fixed
  // count -- pinning 22 here would just have to be edited every time the library grows.
  const byFrequency = new Map<number, number>();
  for (const t of templates) byFrequency.set(t.daysPerWeek, (byFrequency.get(t.daysPerWeek) ?? 0) + 1);
  assert.equal(templates.length, 39);
  for (const f of [2, 3, 4, 5, 6]) {
    assert.ok((byFrequency.get(f) ?? 0) > 0, `no women's template trains ${f} days a week`);
  }
});

test("every exercise name is one the library actually has", () => {
  for (const t of templates) {
    for (const day of t.days) {
      for (const ex of day.exercises) {
        assert.ok(LIBRARY.has(ex.name), `"${ex.name}" (${t.name} / ${day.name}) is not in the library`);
      }
    }
  }
});

test("every exercise's muscle is the library's, not one written by hand", () => {
  for (const t of templates) {
    for (const day of t.days) {
      for (const ex of day.exercises) {
        assert.equal(ex.muscle, LIBRARY.get(ex.name), `${ex.name} is filed under ${ex.muscle}`);
        assert.notEqual(ex.muscle, "General", `${ex.name} resolved to General — it would book volume against nothing`);
      }
    }
  }
});

test("one week each, because the split repeats for the whole block (G116)", () => {
  for (const t of templates) {
    assert.equal(t.weeks, 1, `${t.name} is ${t.weeks} weeks`);
    assert.equal(t.hasDeload, false, `${t.name} has a deload, but one week has no last week to deload`);
  }
});

test("days, day count and weekday count agree", () => {
  for (const t of templates) {
    assert.equal(t.days.length, t.daysPerWeek, `${t.name} has ${t.days.length} days but says ${t.daysPerWeek}`);
    assert.equal(t.trainingDows?.length, t.daysPerWeek, `${t.name}'s weekdays don't match its day count`);
    // buildProgramFromDraft pairs days and weekdays by index, so a mismatch silently shifts every session.
    assert.deepEqual([...(t.trainingDows ?? [])], [...new Set(t.trainingDows ?? [])], `${t.name} repeats a weekday`);
  }
});

test("G111: a four-day week runs Mon/Tue/Thu/Fri", () => {
  // All ten of his four-day templates, without exception: two on, one off, two on, two off.
  for (const t of templates.filter((x) => x.daysPerWeek === 4)) {
    assert.deepEqual([...(t.trainingDows ?? [])].sort((a, b) => a - b), [0, 1, 3, 4], `${t.name} trains on the wrong days`);
  }
});

test("G107: legs lead both days of every lower-emphasis two-day template", () => {
  // The clearest case in his whole set -- all four of his two-day templates lead legs on both days. But
  // those four were all lower-emphasis. G105 records that an upper-emphasis template inverts this
  // deliberately, and the gap-fill added exactly that at two days, so the rule is scoped to the programs it
  // was observed on rather than applied to every template that happens to train twice a week.
  for (const t of templates.filter((x) => x.daysPerWeek === 2 && LOWER_EMPHASIS_INTENT.has(x.intendedFor ?? ""))) {
    for (const day of t.days) {
      assert.ok(LEG.has(day.exercises[0].muscle), `${t.name} / ${day.name} opens on ${day.exercises[0].muscle}`);
    }
  }
});

test("G107: a three-day full-body template trains legs, a push and a pull every day", () => {
  // Scoped to the full-body category. All three of his three-day templates were full body, which is what
  // the rule describes -- a three-day LOWER-EMPHASIS program splitting quads, hamstrings and glutes across
  // its days is a different thing and is not obliged to press on every one of them.
  for (const t of templates.filter((x) => x.daysPerWeek === 3 && x.name.startsWith("Full Body"))) {
    for (const day of t.days) {
      const muscles = new Set(day.exercises.map((e) => e.muscle));
      assert.ok([...muscles].some((m) => LEG.has(m)), `${t.name} / ${day.name} has no leg work`);
      assert.ok(muscles.has("Chest"), `${t.name} / ${day.name} has no chest work`);
      assert.ok(muscles.has("Back"), `${t.name} / ${day.name} has no back work`);
      assert.ok(day.exercises.length >= 7, `${t.name} / ${day.name} has ${day.exercises.length} exercises, under the 7-9 observed`);
    }
  }
});

test("G107: leg leads per week stay inside the counts observed in his templates", () => {
  // 2-day 2 of 2, 3-day 2-3 of 3, 4-day 2-3 of 4, 5-day 3-5 of 5, 6-day 3-6 of 6.
  const BOUNDS: Record<number, [number, number]> = { 2: [2, 2], 3: [2, 3], 4: [2, 3], 5: [3, 5], 6: [3, 6] };
  // G105 is explicit that this does NOT describe every template: one of his own five-day templates is
  // upper-emphasis and "legs never lead a day in it". The counts describe the glute and lower-body ones,
  // and applying them to an upper-emphasis template would be fitting the rule to the wrong programs.
  const LOWER_EMPHASIS = new Set(["Glutes", "Lower Body"]);
  for (const t of templates) {
    if (!LOWER_EMPHASIS.has(t.intendedFor ?? "")) continue;
    const leads = t.days.filter((d) => LEG.has(d.exercises[0].muscle)).length;
    const [lo, hi] = BOUNDS[t.daysPerWeek];
    assert.ok(leads >= lo && leads <= hi, `${t.name}: ${leads} leg leads of ${t.daysPerWeek}, outside ${lo}-${hi}`);
  }
});

test("G106 and G124: a muscle's exercises are consecutive, never interleaved", () => {
  // Nothing in his 47 logged weeks alternates chest/back/chest. A muscle runs as a block.
  for (const t of templates) {
    for (const day of t.days) {
      const seen = new Set<string>();
      let previous = "";
      for (const ex of day.exercises) {
        if (ex.muscle !== previous) {
          assert.ok(!seen.has(ex.muscle), `${t.name} / ${day.name} returns to ${ex.muscle} after leaving it`);
          seen.add(ex.muscle);
          previous = ex.muscle;
        }
      }
    }
  }
});

test("G101: a six-day week carries leg work on most days", () => {
  // Three of his four six-day templates put legs in all six sessions; the FOURTH alternates leg days with
  // upper days. So a template carrying legs on three of six is a shape he approved, not a shortfall -- an
  // earlier version of this asserted >= 4 and was stricter than his own set.
  // Scoped for the same reason as the leg-lead counts: under an upper-body emphasis, G109 says the
  // non-emphasised region is reduced to a single exercise rather than kept on most days, so a six-day
  // upper-emphasis template carrying legs twice is following the rule, not breaking it.
  for (const t of templates.filter((x) => x.daysPerWeek === 6 && LOWER_EMPHASIS_INTENT.has(x.intendedFor ?? ""))) {
    const withLegs = t.days.filter((d) => d.exercises.some((e) => LEG.has(e.muscle))).length;
    assert.ok(withLegs >= 3, `${t.name} carries legs on only ${withLegs} of 6 days`);
  }
});

test("G118: abs or calves appear in every template", () => {
  for (const t of templates) {
    const small = t.days.flatMap((d) => d.exercises).filter((e) => e.muscle === "Abs" || e.muscle === "Calves" || e.muscle === "Obliques");
    assert.ok(small.length > 0, `${t.name} has no abs or calves anywhere`);
  }
});

test("no load is invented", () => {
  // A template is a muscle-order skeleton (G113). What someone lifts is theirs.
  for (const t of templates) {
    for (const day of t.days) {
      for (const ex of day.exercises) {
        for (const s of ex.sets) assert.equal(s.loadValue, 0, `${ex.name} in ${t.name} arrived with a load`);
      }
    }
  }
});

test("every template says who it is for, and ids are unique", () => {
  const ids = new Set<string>();
  for (const t of templates) {
    assert.ok((t.intendedFor ?? "").length > 0, `${t.name} has no emphasis recorded`);
    assert.ok(t.isTemplate, `${t.name} is not marked as a template`);
    assert.equal(t.automatable, false, `${t.name} is automatable — the generator should not build from it unasked`);
    assert.ok(!ids.has(t.id), `duplicate id ${t.id}`);
    ids.add(t.id);
  }
  assert.equal(ids.size, WOMENS_TEMPLATE_SPECS.length);
});

test("every shipped template has an id nothing else uses, across all three files", () => {
  // The check above only ever sees WOMENS_TEMPLATE_SPECS, so a men's or specialty template colliding with a
  // women's one was invisible to it -- and the id is what a template override is keyed on (migration 0029).
  // Two templates sharing an id means deleting either hides both on every account, renaming either renames
  // both, and React draws them under one key. That is indistinguishable from the delete targeting the wrong
  // card, which is the first thing worth ruling out the next time one goes missing.
  const seen = new Map<string, string>();
  for (const t of BUILT_IN_TEMPLATES) {
    const prev = seen.get(t.program.id);
    assert.ok(!prev, `id ${t.program.id} is used by both "${prev}" and "${t.program.name}"`);
    seen.set(t.program.id, t.program.name);
  }
  assert.equal(seen.size, BUILT_IN_TEMPLATES.length);
});

test("an unknown exercise name fails loudly rather than becoming General", () => {
  // The guard that makes every check above safe as the library changes underneath these templates.
  assert.throws(
    () =>
      buildTemplate({
        name: "Bad",
        category: "full-body",
        sex: "women",
        emphasis: "Glutes",
        dows: [0],
        days: [{ name: "Day 1", slots: [["Not A Real Exercise", 3, 10]] }],
      }),
    /not in the exercise library/,
  );
});
