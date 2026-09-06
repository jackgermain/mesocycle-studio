import { supabase } from "../lib/supabase";
import { isoToday } from "../shared/dayStatus";
import type { TrainingWeek, ClientProfile, MealSection } from "../data/types";

/** Sessions and food logs a client hasn't filled in, computed by the coach from stored client state.
 *
 * The same reasoning as `weighInWatch`: the person a coach most needs to hear about is the one who has
 * gone quiet, and an app that isn't being opened cannot report anything about itself. Anything driven by
 * the client's own device would be silent for exactly the people worth chasing. So this is pulled, not
 * pushed.
 *
 * RLS scopes every read here to this coach's own clients (client_state_select, migration 0001).
 */

export interface MissedSession {
  date: string;
  title: string;
}

export interface ClientComplianceGap {
  accountId: string;
  /** Training days whose date has passed with nothing logged. Newest first. */
  missedSessions: MissedSession[];
  /** Days in the window with nutrition on and no food logged at all. Newest first. */
  missedFoodDays: string[];
  /** Nutrition is on and they have never logged a single item -- a different conversation from someone
   * who logs most days and missed Tuesday, so it is reported separately rather than as N missed days. */
  neverLoggedFood: boolean;
  nutritionOn: boolean;
}

interface Row {
  account_id: string;
  profile?: ClientProfile | null;
  weeks?: TrainingWeek[] | null;
  meals?: MealSection[] | null;
}

function isoDaysBack(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= n; i++) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const day = String(t.getDate()).padStart(2, "0");
    out.push(`${t.getFullYear()}-${m}-${day}`);
  }
  return out;
}

export async function loadComplianceGaps(days = 14): Promise<ClientComplianceGap[]> {
  // Only the three paths this needs. `data->program->weeks` is still the heaviest thing here -- it
  // carries every set of every session -- but PostgREST cannot prune inside a nested array, and the
  // alternative is a SQL function and another migration. Worth moving to an RPC if a roster ever gets
  // big enough for this to be felt.
  const { data, error } = await supabase
    .from("client_state")
    .select("account_id, profile:data->profile, weeks:data->program->weeks, meals:data->meals");
  if (error) {
    console.error("Failed to load compliance state", error);
    return [];
  }

  const today = isoToday();
  const window = isoDaysBack(days);
  const out: ClientComplianceGap[] = [];

  for (const row of (data ?? []) as unknown as Row[]) {
    // A missed session is a training day whose date has passed with nothing logged. Rest days are not in
    // this list at all, and "done" is the only status persisted as a real fact -- everything else is
    // derived on read -- so it is the only one that can be trusted from raw stored state.
    const missedSessions: MissedSession[] = [];
    for (const week of row.weeks ?? []) {
      for (const day of week.days ?? []) {
        if (!day.date || day.date >= today) continue;
        if (day.status === "done") continue;
        if (day.date < window[window.length - 1]) continue;
        missedSessions.push({ date: day.date, title: day.muscleSummary || "Session" });
      }
    }
    missedSessions.sort((a, b) => b.date.localeCompare(a.date));

    const nutritionOn = !!row.profile && row.profile.nutritionMode !== "off";
    let missedFoodDays: string[] = [];
    let neverLoggedFood = false;

    if (nutritionOn) {
      const logged = new Set<string>();
      for (const meal of row.meals ?? []) {
        for (const item of meal.items ?? []) {
          // Items logged before dates existed carry no `loggedAt`. They cannot be attributed to a day, so
          // they count as neither logged nor missed -- guessing would invent compliance either way.
          if (item.loggedAt) logged.add(item.loggedAt);
        }
      }
      if (logged.size === 0) {
        neverLoggedFood = true;
      } else {
        // Only count from their first logged day onward. Someone who started on Friday has not "missed"
        // the Monday before it.
        const first = [...logged].sort()[0];
        missedFoodDays = window.filter((d) => d >= first && !logged.has(d));
      }
    }

    if (!missedSessions.length && !missedFoodDays.length && !neverLoggedFood) continue;
    out.push({
      accountId: row.account_id,
      missedSessions,
      missedFoodDays,
      neverLoggedFood,
      nutritionOn,
    });
  }
  return out;
}

/** One number for the Desk's headline count. */
export function totalComplianceItems(gaps: ClientComplianceGap[]): number {
  return gaps.reduce(
    (n, g) => n + g.missedSessions.length + g.missedFoodDays.length + (g.neverLoggedFood ? 1 : 0),
    0,
  );
}
