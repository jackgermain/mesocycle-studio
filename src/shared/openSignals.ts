import { useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";

/** The number of client reports still waiting on the coach, shared by everything that shows it.
 *
 * A module-level store rather than a hook-local fetch: the desk tab's badge is rendered on every coach
 * screen, and a per-component fetch would mean one request per screen per navigation for a number that
 * changes a few times a day. This way every reader shares one value and one refresh. */

let count = 0;
let lastFetch = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Head-only count query -- the desk loads the full rows when it needs them, but a badge only needs a
 * number, and pulling every signal to call `.length` on it would be the expensive way to get one. */
export async function refreshOpenSignalCount(force = false): Promise<void> {
  // Coalesces the burst that happens when several screens mount at once during navigation.
  if (!force && Date.now() - lastFetch < 5000) return;
  lastFetch = Date.now();
  const { count: n, error } = await supabase
    .from("client_signals")
    .select("id", { count: "exact", head: true })
    .is("acknowledged_at", null);
  if (error) {
    console.error("Failed to count open signals", error);
    return;
  }
  const next = n ?? 0;
  if (next !== count) {
    count = next;
    emit();
  }
}

/** Called when the coach clears one, so the badge drops without waiting for the next poll. */
export function noteSignalCleared(): void {
  if (count > 0) {
    count -= 1;
    emit();
  }
}

export function useOpenSignalCount(): number {
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
