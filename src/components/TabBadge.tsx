import React from "react";

/** The count on a tab icon. Shared so the coach's and the client's bars can't drift apart.
 *
 * Every count is shown as a number rather than a plain dot, because "3 clients need something" and "1
 * client needs something" are different sizes of job and the difference is worth a glance. Past 99 it
 * caps, since a three-digit badge is wider than the icon it sits on. */
export function TabBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} waiting in ${label}`}
      className="num"
      style={{
        position: "absolute",
        top: -4,
        right: count > 9 ? -2 : 2,
        minWidth: 15,
        height: 15,
        borderRadius: 8,
        background: "var(--color-accent)",
        color: "var(--color-accent-900)",
        fontSize: 10,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        // Rings the badge in the bar's own colour so it reads as sitting on top of the icon rather than
        // merging into it.
        boxShadow: "0 0 0 2px var(--color-bg)",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
