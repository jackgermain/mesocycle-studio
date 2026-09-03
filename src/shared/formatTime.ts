/** Formats a real ISO timestamp for a chat bubble: "Just now", a bare clock time for today, "Yesterday,
 * 9:42 PM" for yesterday, otherwise a dated label. Falls back to returning the raw value unchanged for
 * anything that isn't a parseable date -- older bubbles saved before real timestamps existed (a literal
 * "now" or an "HH:MM"-only string) can't be recovered, so they just render as whatever was stored. */
export function formatMessageTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "Just now";

  const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return clock;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${clock}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  return `${dateLabel}, ${clock}`;
}

/** The compact form for a thread-list row's trailing timestamp. */
export function formatThreadPreviewTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "now";

  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
