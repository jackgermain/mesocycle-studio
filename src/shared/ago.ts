/** "12m", "3h", "2d" — how long ago, in as few characters as possible.
 *
 * A coach triaging a list needs the age more than the timestamp: "2d" says this has been sitting there
 * for two days and nobody has answered, where "Sep 8, 9:14 PM" makes them work that out themselves for
 * every row. Under a minute reads "now" rather than "0m", because a signal that just arrived is a
 * different thing from one that is merely recent.
 */
export function ago(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.floor((now.getTime() - then) / 60000);
  // Clock skew between a phone and the database can date something a minute into the future; that is
  // "now", not "-1m".
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
