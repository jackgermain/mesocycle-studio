import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";

/** Coach messages the client hasn't seen yet, for the Inbox tab's badge.
 *
 * There's no read/unread flag on the client side of a thread -- `unread` in the stored thread means
 * "unread by the coach". So this counts coach bubbles stamped later than the last time this person opened
 * their inbox, which is kept in their own client_state (see `inboxReadAt`) so it follows them between
 * devices rather than living in one browser. */

type Bubble = { from: "coach" | "client"; text: string; time: string };

let bubbles: Bubble[] = [];
let lastFetch = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export async function refreshInboxBubbles(force = false): Promise<void> {
  if (!force && Date.now() - lastFetch < 5000) return;
  lastFetch = Date.now();
  const { data, error } = await supabase.rpc("get_my_thread");
  if (error) {
    // A client with no coach-side thread yet is the normal case, not a fault worth logging loudly.
    return;
  }
  const next = ((data as { bubbles?: Bubble[] } | null)?.bubbles ?? []).filter((b) => b && b.from === "coach");
  if (next.length !== bubbles.length || next[next.length - 1]?.time !== bubbles[bubbles.length - 1]?.time) {
    bubbles = next;
    emit();
  }
}

function useCoachBubbles(): Bubble[] {
  return useSyncExternalStore(subscribe, () => bubbles, () => bubbles);
}

/** How many coach messages have landed since `readAt`. A never-opened inbox counts everything. */
export function useInboxUnreadCount(readAt: string | null): number {
  const all = useCoachBubbles();

  useEffect(() => {
    void refreshInboxBubbles();
    // Polling rather than realtime: there's no subscription on these tables yet, and a message landing up
    // to half a minute late on a badge is not worth the machinery.
    const id = setInterval(() => void refreshInboxBubbles(true), 30000);
    const onFocus = () => void refreshInboxBubbles();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!all.length) return 0;
  if (!readAt) return all.length;
  return all.filter((b) => typeof b.time === "string" && b.time > readAt).length;
}
