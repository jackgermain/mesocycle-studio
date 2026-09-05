import React, { useState } from "react";

/** The model's caveats about what it read. Worth surfacing -- "these are time-based holds, not rep
 * counts" is exactly the kind of thing a coach must catch -- but left expanded it ran to twenty lines
 * and pushed the actual imported program off the bottom of the screen, so the thing being warned about
 * couldn't be seen at all. Collapsed to a count by default, one tap to read. */
export function AiNotes({ notes, verb }: { notes: string[]; verb: string }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(notes) ? notes : [];
  if (list.length === 0) return null;

  return (
    <div className="cell" style={{ padding: 11, borderLeft: "2px solid var(--color-accent-700)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", color: "inherit", textAlign: "left" }}
      >
        <div className="row" style={{ gap: 8 }}>
          <i className="ph ph-eyes" style={{ fontSize: 15, color: "var(--color-accent-300)", flex: "none" }} />
          <span style={{ flex: 1, fontSize: 13 }}>
            {list.length} thing{list.length === 1 ? "" : "s"} to check before you {verb}
          </span>
          <i className={`ph ${open ? "ph-caret-up" : "ph-caret-down"}`} style={{ fontSize: 14, color: "var(--color-neutral-500)", flex: "none" }} />
        </div>
      </button>
      {open && (
        <ul style={{ margin: "9px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
          {list.map((n, i) => (
            <li key={i} className="mu" style={{ lineHeight: 1.55 }}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
