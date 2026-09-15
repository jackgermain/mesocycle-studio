/** Dating the food log.
 *
 * The bug these exist for: `meals` had no date on it, so Monday's food was still on screen and still
 * counting toward the day's calories on Tuesday. The load-bearing assertions are the ones about where
 * OLD, undated food ends up — it must be preserved, and it must not land on today, or the fix reproduces
 * the bug it was written for on the first load.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backfillMealDates,
  mealDayLabel,
  mealNamesForNewDay,
  mealsOn,
  shiftIsoDate,
  weekdayOf,
} from "../src/shared/mealDays";
import type { MealSection } from "../src/data/types";

const food = (id: string, loggedAt?: string, kcal = 100) =>
  ({ id, foodId: "f1", name: `food ${id}`, servingLabel: "1 serving", servings: 1, kcal, protein: 10, carbs: 10, fat: 1, ...(loggedAt ? { loggedAt } : {}) });

const meal = (over: Partial<MealSection> & { id: string }): MealSection =>
  ({ name: "Meal 1", items: [], ...over }) as MealSection;

test("shiftIsoDate steps days, months, years and leap days", () => {
  assert.equal(shiftIsoDate("2026-09-15", -1), "2026-09-14");
  assert.equal(shiftIsoDate("2026-09-15", 1), "2026-09-16");
  assert.equal(shiftIsoDate("2026-09-01", -1), "2026-08-31");
  assert.equal(shiftIsoDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftIsoDate("2026-12-31", 1), "2027-01-01");
  // 2028 is a leap year; 2026 is not.
  assert.equal(shiftIsoDate("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftIsoDate("2026-02-28", 1), "2026-03-01");
});

test("shiftIsoDate does not slip a day in a timezone behind UTC", () => {
  // `new Date("2026-09-15")` is UTC midnight, which reads back as the 14th anywhere west of Greenwich.
  // Stepping by zero has to be the identity in every timezone.
  assert.equal(shiftIsoDate("2026-09-15", 0), "2026-09-15");
  assert.equal(weekdayOf("2026-09-15"), "Tuesday");
});

test("the date control names the days around now and dates the rest", () => {
  const today = "2026-09-15";
  assert.equal(mealDayLabel(today, today), "Today");
  assert.equal(mealDayLabel("2026-09-14", today), "Yesterday");
  assert.equal(mealDayLabel("2026-09-16", today), "Tomorrow");
  assert.equal(mealDayLabel("2026-09-11", today), "Fri, Sep 11");
});

test("the reported bug: yesterday's food is not on today", () => {
  const meals = backfillMealDates([meal({ id: "m1", items: [food("a", "2026-09-14"), food("b", "2026-09-14")] })], "2026-09-15");
  assert.equal(mealsOn(meals, "2026-09-15").length, 0, "today must start clean");
  assert.equal(mealsOn(meals, "2026-09-14").length, 1);
  assert.equal(mealsOn(meals, "2026-09-14")[0].items.length, 2, "and yesterday must still have it");
});

test("a meal holding several days of food splits into one section per day", () => {
  const meals = backfillMealDates(
    [meal({ id: "m1", items: [food("a", "2026-09-12"), food("b", "2026-09-14"), food("c", "2026-09-12")] })],
    "2026-09-15",
  );
  assert.equal(meals.length, 2);
  assert.deepEqual(meals.map((m) => m.date), ["2026-09-12", "2026-09-14"]);
  assert.deepEqual(meals.map((m) => m.items.length), [2, 1]);
  // Never two sections sharing an id -- React keys off it, and REMOVE_MEAL matches on it.
  assert.equal(new Set(meals.map((m) => m.id)).size, 2);
});

test("nothing is lost in a backfill, however the sections fall", () => {
  const before = [
    meal({ id: "m1", items: [food("a", "2026-09-12"), food("b", "2026-09-14")] }),
    meal({ id: "m2", name: "Meal 2", items: [food("c"), food("d", "2026-09-14")] }),
    meal({ id: "m3", name: "Meal 3" }),
  ];
  const after = backfillMealDates(before, "2026-09-15");
  const ids = (ms: MealSection[]) => ms.flatMap((m) => m.items.map((i) => i.id)).sort();
  assert.deepEqual(ids(after), ids(before));
});

test("food logged before dates existed is kept, and never lands on today", () => {
  const today = "2026-09-15";
  const meals = backfillMealDates([meal({ id: "m1", items: [food("a"), food("b")] })], today);
  assert.equal(mealsOn(meals, today).length, 0);
  assert.equal(meals[0].items.length, 2, "it is kept, not discarded");
  // No evidence anywhere in the blob, so it files on yesterday -- unattributable, but not today's.
  assert.equal(meals[0].date, "2026-09-14");
});

test("undated food files on the newest day the blob has evidence of", () => {
  const meals = backfillMealDates(
    [meal({ id: "m1", items: [food("old")] }), meal({ id: "m2", name: "Meal 2", items: [food("b", "2026-09-10")] })],
    "2026-09-15",
  );
  assert.equal(meals.find((m) => m.id === "m1")!.date, "2026-09-10");
});

test("an empty section is structural and opens on today; ticked portions are not", () => {
  const today = "2026-09-15";
  const [empty, ticked, filed] = backfillMealDates(
    [
      meal({ id: "m1" }),
      meal({ id: "m2", portionsHit: ["Protein"] }),
      meal({ id: "m3", portionsHit: ["Protein"], submittedAt: "2026-09-13" }),
    ],
    today,
  );
  assert.equal(empty.date, today);
  assert.equal(ticked.date, "2026-09-14", "yesterday's ticks must not become today's");
  assert.equal(filed.date, "2026-09-13", "a filed day knows its own date");
});

test("backfill is idempotent and does not churn an already-dated blob", () => {
  const once = backfillMealDates([meal({ id: "m1", items: [food("a", "2026-09-12"), food("b", "2026-09-14")] })], "2026-09-15");
  const twice = backfillMealDates(once, "2026-09-15");
  // Same array reference: a normal load must not mark the store dirty and upsert the whole blob again.
  assert.equal(twice, once);
});

test("mealsOn keeps the authored order", () => {
  const meals = [
    meal({ id: "m1", name: "Breakfast", date: "2026-09-15" }),
    meal({ id: "m2", name: "Lunch", date: "2026-09-14" }),
    meal({ id: "m3", name: "Dinner", date: "2026-09-15" }),
  ];
  assert.deepEqual(mealsOn(meals, "2026-09-15").map((m) => m.name), ["Breakfast", "Dinner"]);
});

test("a new day copies the last day's section names, not its food", () => {
  const meals = [
    meal({ id: "m1", name: "Meal 1", date: "2026-09-10" }),
    meal({ id: "m2", name: "Breakfast", date: "2026-09-14", items: [food("a", "2026-09-14")] }),
    meal({ id: "m3", name: "Lunch", date: "2026-09-14" }),
    meal({ id: "m4", name: "Dinner", date: "2026-09-14" }),
  ];
  assert.deepEqual(mealNamesForNewDay(meals, "2026-09-15"), ["Breakfast", "Lunch", "Dinner"]);
});

test("a new day ignores later days when looking back", () => {
  const meals = [
    meal({ id: "m1", name: "Breakfast", date: "2026-09-14" }),
    meal({ id: "m2", name: "Planned ahead", date: "2026-09-20" }),
  ];
  assert.deepEqual(mealNamesForNewDay(meals, "2026-09-15"), ["Breakfast"]);
});

test("the first day ever opens with the default sections", () => {
  assert.deepEqual(mealNamesForNewDay([], "2026-09-15"), ["Meal 1", "Meal 2", "Meal 3"]);
});
