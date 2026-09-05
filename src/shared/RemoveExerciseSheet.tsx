import React from "react";

/** Dropping a movement, scoped the same way a swap is. Worth asking rather than assuming for the same
 * reason: "the machine is taken today" and "this exercise doesn't suit me" are the same gesture with very
 * different intentions. Unlike a swap, nothing replaces it -- so the sheet says out loud that the muscle
 * loses those sets, which is the part that's easy to do by accident. */
export function RemoveExerciseSheet({
  name,
  onChoose,
  onClose,
}: {
  name: string;
  onChoose: (scope: "day" | "mesocycle") => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="scr">Remove</div>
            <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="mu" style={{ lineHeight: 1.55 }}>
          Nothing replaces it — whatever this trains loses those sets. Sessions already logged keep it either way.
        </div>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("day")}>
          <i className="ph ph-calendar-blank" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Just today</div>
            <div className="mu" style={{ marginTop: 1 }}>Every other week keeps it.</div>
          </div>
        </button>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("mesocycle")}>
          <i className="ph ph-trash" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Rest of the mesocycle</div>
            <div className="mu" style={{ marginTop: 1 }}>Takes it out of every session that's left.</div>
          </div>
        </button>
      </div>
    </div>
  );
}
