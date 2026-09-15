import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_TEMPLATES } from "../src/coach/builtInTemplates";
import { libraryExercises } from "../src/coach/exerciseLibrary";

/** Every shipped template, checked against the rules Jack has actually written down.
 *
 * This file exists because the rules were written and nothing enforced them. `exercises-v1.md` has said
 * since G9 that decline pressing is never prescribed -- in his own words, "I've never ever ever given
 * somebody it, ever" -- and 61 days across 53 of the 125 templates prescribed it anyway, because
 * `deepen()` built its candidate pool from the whole library and never consulted the denylist. Jack, on
 * finding it in a generated day: "You've heard the rules before of everything I've taught you about
 * programming, so I don't know why that's not implemented into this as well."
 *
 * A rule written in prose and asserted nowhere is a suggestion. These assertions are the difference.
 *
 * Every check below runs over the EXPANDED templates (post-deepen), not the hand-authored specs, because
 * the specs were already clean -- zero decline presses in any of the three spec files. The violations were
 * all manufactured at build time, which is exactly the surface a spec-level check would have missed. */

const days = BUILT_IN_TEMPLATES.flatMap((t) =>
  t.program.days.map((d) => ({ template: t.program.name, day: d.name, exercises: d.exercises })),
);
const where = (t: string, d: string) => `${t} / ${d}`;

test("no template prescribes a denylisted exercise (G9, G131)", () => {
  // The two decline presses are gone from the library outright, so they cannot recur; the rest remain
  // catalogue entries a coach may write by hand, but nothing shipped may contain them.
  const denied = ["Rack Pull", "Ab Wheel Rollout", "Sissy Squat", "Preacher Curl — Barbell", "Preacher Curl Machine"];
  for (const { template, day, exercises } of days) {
    for (const e of exercises) {
      assert.ok(!denied.includes(e.name), `${where(template, day)} prescribes denylisted "${e.name}"`);
    }
  }
});

test("both decline presses are gone from the library, not merely unused (G131)", () => {
  // Jack: "We're not going to use that exercise at all." Deleting the entry is what makes that true of
  // every future generator pass as well as today's templates.
  for (const banned of ["Decline Barbell Bench Press", "Decline Dumbbell Press"]) {
    assert.ok(!libraryExercises.some((e) => e.name === banned), `"${banned}" is still in the library`);
  }
});

test("a barbell bench press is never the third CHEST exercise (G128)", () => {
  // "No incline barbell bench press after incline dumbbell press. And especially not after as a third
  // exercise." Counted in chest exercises, not raw slots, and that distinction matters: fourteen leg and
  // full-body days open on squats and reach the bench at slot 4-6, where it is the FIRST pressing movement
  // of the session. A raw slot test flagged all of them and would have forced a bench ahead of the squats.
  // Jack, asked directly, scoped it to chest-led days.
  for (const { template, day, exercises } of days) {
    exercises.forEach((e, i) => {
      if (!/barbell bench press/i.test(e.name)) return;
      const chestBefore = exercises.slice(0, i).filter((x) => x.muscle === "Chest").length;
      assert.ok(chestBefore < 2, `${where(template, day)} has "${e.name}" after ${chestBefore} chest exercises`);
    });
  }
});

test("no session lists the same exercise twice", () => {
  // Forty-two days did, hand-authored -- "Dumbbell Shoulder Press, Arnold Press, ... Arnold Press" and
  // "Seated Cable Row, Barbell Bent-Over Row, Seated Cable Row". deepen()'s `used` set is built once per
  // TEMPLATE, so a name written twice inside one authored day was never deduplicated, and nothing checked.
  for (const { template, day, exercises } of days) {
    const names = exercises.map((e) => e.name);
    const dupe = names.find((n, i) => names.indexOf(n) !== i);
    assert.ok(!dupe, `${where(template, day)} lists "${dupe}" twice`);
  }
});

test("pull-ups come before pulldowns when both are in a session (G129)", () => {
  for (const { template, day, exercises } of days) {
    const names = exercises.map((e) => e.name);
    const up = names.findIndex((n) => /\bpull-?up|\bchin-?up/i.test(n));
    // Straight-arm pulldowns are not vertical pulls and are deliberately out of scope.
    const down = names.findIndex((n) => /pulldown/i.test(n) && !/straight-?arm/i.test(n));
    if (up === -1 || down === -1) return;
    assert.ok(up < down, `${where(template, day)} puts ${names[down]} before ${names[up]}`);
  }
});

test("front squat and back squat never share a day (G130)", () => {
  for (const { template, day, exercises } of days) {
    const hasFront = exercises.some((e) => /front squat/i.test(e.name));
    const hasBack = exercises.some((e) => /back squat/i.test(e.name));
    assert.ok(!(hasFront && hasBack), `${where(template, day)} has both a front and a back squat`);
  }
});

test("no template slot opens above three sets (G132)", () => {
  // "Let's start with anything that would be four sets. Let's drop it to three sets, at least for the first
  // week on absolutely everything." Four remains legal later in a block as a progression step; a template
  // is the STARTING prescription.
  for (const { template, day, exercises } of days) {
    for (const e of exercises) {
      assert.ok(e.sets.length <= 3, `${where(template, day)} has ${e.name} at ${e.sets.length} sets`);
    }
  }
});

test("a fly never opens a session", () => {
  // > "I would never, in any cases, do either one of these exercises first. Ever."
  for (const { template, day, exercises } of days) {
    const first = exercises[0]?.name ?? "";
    assert.ok(!/\bfly\b|pec deck/i.test(first), `${where(template, day)} opens on ${first}`);
  }
});

test("every exercise a template names still exists in the library", () => {
  // The backstop for all of the above: deleting a library entry silently orphans any template pointing at
  // it, and buildTemplate would throw at module load -- but only for names it still knows to look for.
  const known = new Set(libraryExercises.map((e) => e.name));
  for (const { template, day, exercises } of days) {
    for (const e of exercises) assert.ok(known.has(e.name), `${where(template, day)} names unknown "${e.name}"`);
  }
});
