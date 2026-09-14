import React from "react";

/** Adding a movement to a session, scoped the same way a swap or a removal is.
 *
 * Asked rather than assumed for the same reason those ask: "there's a machine free and I want one more
 * thing today" and "this block is missing something" are the same gesture with different intentions, and
 * guessing wrong is either a change that vanishes tomorrow or one that quietly rewrites the whole block.
 *
 * The wording of the second option is deliberately narrower than the removal sheet's. Removing scopes by
 * exercise NAME across every remaining session, because a movement you have dropped should stay dropped
 * wherever it appears. An addition has no existing occurrence to match on, so it scopes by session type
 * instead -- adding a leg curl to a lower day should not put one in every push day. */
export function AddExerciseSheet({
  name,
  dayLabel,
  onChoose,
  onClose,
}: {
  name: string;
  dayLabel: string;
  onChoose: (scope: "day" | "mesocycle") => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="scr">Add</div>
            <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="mu" style={{ lineHeight: 1.55 }}>
          Goes in at 3 sets of 10 — change the sets and reps on the card once it's in. Sessions already
          logged are left alone.
        </div>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("day")}>
          <i className="ph ph-calendar-blank" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Just today</div>
            <div className="mu" style={{ marginTop: 1 }}>One-off — no other session changes.</div>
          </div>
        </button>

        <button className="link-row" style={{ padding: "12px 12px" }} onClick={() => onChoose("mesocycle")}>
          <i className="ph ph-repeat" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Every {dayLabel} from here</div>
            <div className="mu" style={{ marginTop: 1 }}>Adds it to this session every week that's left.</div>
          </div>
        </button>
      </div>
    </div>
  );
}
