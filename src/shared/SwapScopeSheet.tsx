import React from "react";

/** After picking a replacement, how far the swap should reach. Worth asking rather than assuming: an
 * equipment clash today and "this movement doesn't suit me" are the same gesture but very different
 * intentions, and the swap used to silently do the second one every time -- rewriting the exercise in
 * every remaining week with no way to change just today's session. */
export function SwapScopeSheet({
  fromName,
  toName,
  onChoose,
  onClose,
}: {
  fromName: string;
  toName: string;
  onChoose: (scope: "day" | "mesocycle") => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Swap</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{fromName} → {toName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("day")}>
          <i className="ph ph-calendar-blank" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Just today</div>
            <div className="mu" style={{ marginTop: 1 }}>Every other week keeps {fromName}.</div>
          </div>
        </button>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("mesocycle")}>
          <i className="ph ph-arrows-clockwise" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Rest of the block</div>
            <div className="mu" style={{ marginTop: 1 }}>Replaces it everywhere it still appears. Sessions already logged stay as they were.</div>
          </div>
        </button>
      </div>
    </div>
  );
}
