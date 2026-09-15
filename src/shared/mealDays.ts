import type { LoggedFoodItem, MealSection } from "../data/types";

/** Which day a logged meal belongs to.
 *
 * `meals` was one perpetual list with no date on it. Food logged on Monday was still sitting in Meal 1 on
 * Tuesday, still counting toward Tuesday's calories, and the only way to start a new day was to delete
 * yesterday's food by hand. Jack, with a screenshot of Tuesday showing Monday's macros: "it didn't refresh
 * the page today".
 *
 * So a meal is now stamped with the day it belongs to, and the screen shows one day at a time. The day
 * rolls over on its own at midnight -- submitting is "close and file this day", not "unlock the next one",
 * because forgetting to submit on Monday must never leave you unable to log on Tuesday, which is exactly
 * the state that screenshot was in.
 *
 * Everything here is pure and date-string in, date-string out, so it can be tested without a store or a
 * clock -- `tests/mealDays.test.mts`. */

const DEFAULT_MEAL_NAMES = ["Meal 1", "Meal 2", "Meal 3"];

/** Step an ISO yyyy-mm-dd by whole days.
 *
 * Built through Date.UTC from the parsed parts rather than `new Date(iso)`: a bare "2026-09-15" parses as
 * UTC midnight, so reading it back with the local getters returns the day before for anyone west of
 * Greenwich. Both ends stay in the UTC frame here, which also gets month, year and leap-day rollover for
 * free rather than by hand. */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(at.getUTCDate()).padStart(2, "0");
  return `${at.getUTCFullYear()}-${mm}-${dd}`;
}

/** Parsed as local parts, never from the ISO string, for the same reason as above -- a date built from
 * "2026-09-15" directly would print as the 14th in every timezone behind UTC. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Monday" — the kicker line, which reads as a day of the week rather than a date. */
export function weekdayOf(iso: string): string {
  return localDate(iso).toLocaleDateString("en-US", { weekday: "long" });
}

/** What the date control itself says. The three days either side of now are named rather than dated,
 * since "Yesterday" is what you would call it out loud and is what makes the arrows self-explanatory. */
export function mealDayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === shiftIsoDate(today, -1)) return "Yesterday";
  if (iso === shiftIsoDate(today, 1)) return "Tomorrow";
  return localDate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** The sections belonging to one day, in the order they were authored.
 *
 * Every meal carries a date once `backfillMealDates` has run on hydrate, so an undated meal here means a
 * blob written by an older tab that is still open. It is deliberately not shown on any day rather than
 * being folded into today -- today is the one day it definitely does not belong to. */
export function mealsOn(meals: MealSection[], date: string): MealSection[] {
  return meals.filter((m) => m.date === date);
}

/** The sections to open a fresh day with.
 *
 * The most recent day's section NAMES, carried forward without its food. Someone who renamed theirs to
 * Breakfast/Lunch/Dinner, or who eats five meals, keeps that shape tomorrow instead of being reset to
 * "Meal 1, Meal 2, Meal 3" every morning. Only the names carry over; nothing is pre-filled, because a
 * meal you have not eaten yet must not count toward the day. */
export function mealNamesForNewDay(meals: MealSection[], date: string): string[] {
  const priorDates = meals.map((m) => m.date).filter((d): d is string => !!d && d < date);
  if (!priorDates.length) return DEFAULT_MEAL_NAMES;
  const latest = priorDates.sort()[priorDates.length - 1];
  const names = mealsOn(meals, latest).map((m) => m.name);
  return names.length ? names : DEFAULT_MEAL_NAMES;
}

/** Give every undated meal a date, once, on hydrate.
 *
 * Returns the SAME array when everything is already dated, so a normal load does not mark the store dirty
 * and upsert the whole blob back to Supabase for no reason.
 *
 * Nothing is thrown away. The rules, in order of how much evidence there is:
 *
 *  - Food carries `loggedAt`, so a meal is filed on the day its food was logged. A meal holding food from
 *    several days SPLITS into one section per day -- filing the whole section under its newest day would
 *    pile every earlier day's calories onto that one, which is precisely what the arrows would then show.
 *  - Food logged before `loggedAt` existed cannot be attributed to a day. It goes to the newest day we
 *    have any evidence of, and with no evidence anywhere, to yesterday. Never to today: dropping
 *    unattributable food onto today's total is the bug this whole change exists to fix.
 *  - A section with no food and no ticks is structural, not history -- an empty "Meal 4" someone added --
 *    so it opens on today.
 *  - A portions-mode section has no items to read a date from; its `submittedAt` is when it was filed, and
 *    ticks with no submission are old activity that must not become today's. */
export function backfillMealDates(meals: MealSection[], today: string): MealSection[] {
  if (meals.every((m) => m.date)) return meals;

  const known = meals.flatMap((m) => m.items.map((i) => i.loggedAt).filter((d): d is string => !!d)).sort();
  const undatedHome = known.length ? known[known.length - 1] : shiftIsoDate(today, -1);

  const out: MealSection[] = [];
  for (const meal of meals) {
    if (meal.date) {
      out.push(meal);
      continue;
    }
    if (!meal.items.length) {
      out.push({ ...meal, date: meal.submittedAt ?? (meal.portionsHit?.length ? undatedHome : today) });
      continue;
    }

    const byDate = new Map<string, LoggedFoodItem[]>();
    for (const item of meal.items) {
      const d = item.loggedAt ?? undatedHome;
      const list = byDate.get(d);
      if (list) list.push(item);
      else byDate.set(d, [item]);
    }

    for (const d of [...byDate.keys()].sort()) {
      out.push({
        // The id is only suffixed when a split actually happens, so the common case keeps the id it
        // already had. Derived from the date rather than a counter so running this twice would land on the
        // same ids instead of manufacturing duplicate sections.
        ...meal,
        id: byDate.size === 1 ? meal.id : `${meal.id}-${d}`,
        date: d,
        items: byDate.get(d)!,
      });
    }
  }
  return out;
}
