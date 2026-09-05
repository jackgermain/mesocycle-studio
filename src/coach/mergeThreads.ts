import type { CoachThread } from "./types";

/** Folds the threads the server holds into the ones this app has in memory.
 *
 * A client's message is written straight into the coach's blob by send_client_message, but the coach's
 * app only reads that blob once, on mount, and overwrites the whole thing on every local change -- so an
 * incoming message could be clobbered before it was ever seen, and its unread flag with it.
 *
 * Merged rather than replaced, per thread:
 *   bubbles -- whichever side has more, since both sides only ever append
 *   unread  -- stays false once read locally, unless the server has bubbles this app hadn't seen
 *
 * That second rule is what keeps a poll from resurrecting a badge the coach just cleared, and the first
 * is what stops a poll that started before the coach hit send from reverting their own message.
 *
 * Returns the original array when nothing changed. The caller relies on that: the provider upserts the
 * whole state whenever it changes, so handing back a fresh array every 30 seconds would turn a read-only
 * poll into a write loop. */
export function mergeThreads(local: CoachThread[], incoming: CoachThread[]): CoachThread[] {
  let changed = false;
  const byId = new Map(local.map((t) => [t.id, t]));

  for (const remote of incoming) {
    const mine = byId.get(remote.id);
    if (!mine) {
      byId.set(remote.id, remote);
      changed = true;
      continue;
    }
    const hasNews = (remote.bubbles?.length ?? 0) > (mine.bubbles?.length ?? 0);
    const unread = mine.unread || (hasNews && remote.unread);
    if (!hasNews && unread === mine.unread) continue;
    byId.set(remote.id, {
      ...mine,
      ...(hasNews ? { bubbles: remote.bubbles, preview: remote.preview, time: remote.time } : {}),
      unread,
    });
    changed = true;
  }

  return changed ? Array.from(byId.values()) : local;
}
