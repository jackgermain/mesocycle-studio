import React from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { isIntakeStale, isIntakeUsable } from "../shared/intake";

/** The nudge to fill in intake, on the screen everyone opens.
 *
 * Deliberately not a gate. Blocking someone out of their own training until they answer a form is a good
 * way to lose them on day one, and a partly-answered intake is still worth having -- so this asks, says
 * why, and gets out of the way. */
export function IntakeDue() {
  const { state } = useStore();
  const nav = useNavigate();
  const intake = state.intake;
  const done = !!intake?.completedAt;
  const stale = isIntakeStale(intake);

  if (done && !stale && isIntakeUsable(intake)) return null;

  return (
    <button
      className="cell row"
      style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--color-accent-800)" }}
      onClick={() => nav("/intake")}
    >
      <i className="ph-fill ph-clipboard-text" style={{ fontSize: 18, color: "var(--color-accent)", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>
          {done ? "A few more details" : `Tell ${state.program.coachName.split(" ")[0]} about you`}
        </div>
        <div className="mu" style={{ marginTop: 1 }}>
          {stale
            ? "There are some new questions since you last answered."
            : done
              ? "The parts you skipped are the ones that shape your programming most."
              : "Two minutes. It's what your programming gets built from."}
        </div>
      </div>
      <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)", flex: "none" }} />
    </button>
  );
}
