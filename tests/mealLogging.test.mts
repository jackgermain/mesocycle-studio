/** What counts toward the day's macros.
 *
 * The rule that matters is the back-compat one: `eaten === false` is planned-but-not-eaten and must not
 * count, while `undefined` is anything logged before ticking existed and must still count. Getting that
 * backwards zeroes every existing food log the day it ships. */
import { test } from "node:test";
import assert from "node:assert/strict";

/** Mirrors the predicate in Nutrition.tsx. Kept here as the specification of the rule, since the screen
 * itself is a .tsx and Node's type stripping cannot run JSX. */
const counts = (i: { eaten?: boolean }) => i.eaten !== false;

test("a ticked item counts", () => {
  assert.equal(counts({ eaten: true }), true);
});

test("a planned item does not count", () => {
  assert.equal(counts({ eaten: false }), false);
});

test("an item from before ticking existed still counts", () => {
  // The whole point: nobody's history zeroes itself overnight.
  assert.equal(counts({}), true);
  assert.equal(counts({ eaten: undefined }), true);
});

test("a meal's total is the sum of ticked items only", () => {
  const items = [
    { eaten: true, kcal: 400 },
    { eaten: false, kcal: 900 },
    { kcal: 100 }, // legacy
  ];
  const kcal = items.filter(counts).reduce((n, i) => n + i.kcal, 0);
  assert.equal(kcal, 500);
});
