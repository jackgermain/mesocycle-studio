import { supabase } from "../lib/supabase";
import { missedWeighIns, weighInsEnabled, type MissedWeighIn, type WeighInProfileLike, type WeighInSkip } from "../shared/weighIns";

export interface ClientWeighInGap {
  accountId: string;
  /** Newest first, so the most recent lapse leads. */
  entries: MissedWeighIn[];
  missedCount: number;
  skippedCount: number;
}

interface Row {
  account_id: string;
  profile?: WeighInProfileLike | null;
  weighIns?: { date: string }[] | null;
  weighInSkips?: WeighInSkip[] | null;
}

/** Missed and skipped weigh-ins across the coach's whole roster.
 *
 * Deliberately computed by the coach, from the clients' stored state, rather than reported by the client's
 * app. The case a coach most needs to hear about is someone who has gone quiet -- and an app that isn't
 * being opened cannot report anything about itself. Anything client-driven would be silent for exactly the
 * people worth chasing.
 *
 * Only the three JSON paths this needs are selected. A client's blob holds their whole program, every meal
 * and every logged set; pulling all of that for every client to count dates would be enormously wasteful.
 * RLS scopes the read to this coach's own clients (client_state_select in migration 0001). */
export async function loadWeighInGaps(days = 14): Promise<ClientWeighInGap[]> {
  const { data, error } = await supabase
    .from("client_state")
    .select("account_id, profile:data->profile, weighIns:data->weighIns, weighInSkips:data->weighInSkips");
  if (error) {
    console.error("Failed to load weigh-in state", error);
    return [];
  }

  const out: ClientWeighInGap[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    const profile = row.profile;
    if (!profile || !weighInsEnabled(profile)) continue;
    const entries = missedWeighIns(profile, row.weighIns ?? [], row.weighInSkips ?? [], days)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!entries.length) continue;
    out.push({
      accountId: row.account_id,
      entries,
      missedCount: entries.filter((e) => e.kind === "missed").length,
      skippedCount: entries.filter((e) => e.kind === "skipped").length,
    });
  }
  return out;
}
