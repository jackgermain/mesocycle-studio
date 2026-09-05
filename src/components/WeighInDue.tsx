import React, { useState } from "react";
import { useStore } from "../state/store";
import { isOutstandingToday } from "../shared/weighIns";
import { isoToday } from "../shared/dayStatus";

const SKIP_REASONS = ["No scale today", "Away from home", "Forgot this morning", "Don't want to today"];

/** The weigh-in prompt, on the screen people actually open.
 *
 * A weigh-in used to be a passive row on the Progress tab: if you never went there, nothing ever asked.
 * That made "3x a week" a suggestion, and left a coach unable to tell someone who declined from someone
 * who simply never saw the question.
 *
 * So it asks here, and the only two ways past it are a number or a reason. The reason matters as much as
 * the weight -- "away from home" and silence look identical in the data otherwise, and only one of them
 * is worth a message. */
export function WeighInDue() {
  const { state, dispatch } = useStore();
  const [weight, setWeight] = useState("");
  const [skipping, setSkipping] = useState(false);
  const p = state.profile;
  const today = isoToday();

  if (!isOutstandingToday(p, state.weighIns, state.weighInSkips ?? [])) return null;

  function save() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    dispatch({ type: "LOG_WEIGHIN", date: today, weight: w });
    dispatch({ type: "SHOW_TOAST", message: "Weigh-in logged." });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2200);
  }

  function skip(reason: string) {
    dispatch({ type: "SKIP_WEIGH_IN", date: today, reason });
    dispatch({ type: "SHOW_TOAST", message: `Noted — ${state.program.coachName} will see you skipped today.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
    setSkipping(false);
  }

  return (
    <div className="cell elev-sm" style={{ border: "1px solid var(--color-accent-800)" }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <i className="ph-fill ph-scales" style={{ fontSize: 18, color: "var(--color-accent)", flex: "none" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>Weigh-in due today</div>
          <div className="mu" style={{ marginTop: 1 }}>
            <span className="mono">{p.weighInsPerWeek}</span>× a week — {p.weighInDays.join(", ")}, first thing.
          </div>
        </div>
      </div>

      {!skipping ? (
        <>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={`Weight in ${p.units}`}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <button className="btn btn-solid" style={{ flex: "none", height: 38 }} disabled={!weight.trim()} onClick={save}>
              Log
            </button>
          </div>
          <button
            onClick={() => setSkipping(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "var(--text-sm)", padding: "8px 0 0", textAlign: "left" }}
          >
            Can't today
          </button>
        </>
      ) : (
        <div>
          <div className="sh">Why not?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SKIP_REASONS.map((r) => (
              <button key={r} className="chip" onClick={() => skip(r)}>{r}</button>
            ))}
          </div>
          <button
            onClick={() => setSkipping(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "var(--text-sm)", padding: "10px 0 0", textAlign: "left" }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
