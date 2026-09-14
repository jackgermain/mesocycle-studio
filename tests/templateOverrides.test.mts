import { test } from "node:test";
import assert from "node:assert/strict";
// The pure module, deliberately. templateOverrides.ts creates the Supabase client at import time and
// lib/supabase.ts reads import.meta.env, which is undefined here -- importing it throws before any
// assertion runs.
import { applyOverride } from "../src/shared/templateOverrideApply";
import { womensTemplates } from "../src/coach/womensTemplates";

/** Template edits that land on every account.
 *
 * The built-in templates are code constants, so a rename or a deletion cannot change the bundle. Every
 * change is a row in `template_overrides` (migration 0029) layered on at read time, which means this one
 * function decides what 125 templates look like for everybody. It is worth pinning.
 *
 * The recompute is the part most likely to be silently wrong: an edit that removes sets has to change the
 * numbers shown beside the template, or the card advertises volume the program no longer contains. */

const base = womensTemplates()[0];

test("no override leaves the template exactly as it ships", () => {
  assert.equal(applyOverride(base, undefined), base);
});

test("a rename shows the new name and nothing else moves", () => {
  const out = applyOverride(base, { templateId: base.id, name: "Jack's Glute Block" });
  assert.ok(out);
  assert.equal(out.name, "Jack's Glute Block");
  assert.equal(out.days.length, base.days.length);
  assert.equal(out.weeklySets, base.weeklySets);
});

test("a blank or whitespace name falls back to the shipped one rather than showing nothing", () => {
  for (const name of ["", "   ", null]) {
    const out = applyOverride(base, { templateId: base.id, name });
    assert.ok(out);
    assert.equal(out.name, base.name, `"${name}" should not become the template's name`);
  }
});

test("a deleted template resolves to null, which is how it leaves everyone's list", () => {
  assert.equal(applyOverride(base, { templateId: base.id, hidden: true }), null);
});

test("editing the contents replaces the week and RECOUNTS the sets", () => {
  // Jack: "if I modify a template by reducing amount of sets or what not I want it to be shown for
  // everybody." Carrying the old weeklySets across would leave the card claiming volume that is gone.
  const trimmed = base.days.slice(0, 2).map((d) => ({ ...d, exercises: d.exercises.slice(0, 2) }));
  const out = applyOverride(base, { templateId: base.id, days: trimmed });
  assert.ok(out);
  assert.equal(out.days.length, 2);
  assert.equal(out.daysPerWeek, 2, "the day count has to follow the edit");
  const expected = trimmed.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
  assert.equal(out.weeklySets, expected);
  assert.ok(out.weeklySets < base.weeklySets, "trimming exercises should reduce the set count");
});

test("an empty days array is treated as 'contents untouched', not as an empty program", () => {
  // The column is null when only the name changed; an empty array arriving from anywhere must not wipe the
  // template out, because a template with no days is not a program.
  const out = applyOverride(base, { templateId: base.id, days: [] });
  assert.ok(out);
  assert.equal(out.days.length, base.days.length);
});

test("a rename and a contents edit survive together", () => {
  const trimmed = base.days.slice(0, 3);
  const out = applyOverride(base, { templateId: base.id, name: "Renamed", days: trimmed });
  assert.ok(out);
  assert.equal(out.name, "Renamed");
  assert.equal(out.days.length, 3);
});
