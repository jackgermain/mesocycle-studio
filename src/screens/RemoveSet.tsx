import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { CloseHeader, InfoBanner } from "../components/UI";
import { removeSetReasons } from "../data/mockData";

export default function RemoveSet() {
  const { dayId = "", exerciseId = "", setId = "" } = useParams();
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const [reason, setReason] = useState(removeSetReasons[0]);

  const found = findDay(state.program, dayId);
  const ex = found?.day.exercises[exerciseId];
  const set = ex?.sets.find((s) => s.id === setId);
  if (!found || !ex || !set) return <div className="screen-scroll">Not found.</div>;

  const priorRemovals = state.removals.filter((r) => r.exerciseName === ex.name).length + 1;

  function confirmRemove() {
    dispatch({ type: "REMOVE_SET", dayId, exerciseId, setId, reason });
    nav(-1);
  }

  return (
    <div className="screen">
      <CloseHeader kicker={`${ex.name} · set ${set.index}`} title="Remove this set?" />
      <div className="screen-scroll">
        <InfoBanner icon="ph-warning">
          {state.program.coachName} is told which set you removed and why. This will show as a removal against {ex.muscle.toLowerCase()} volume for the week.
        </InfoBanner>

        <div>
          <div className="sh">Why are you removing it?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {removeSetReasons.map((r) => {
              const on = reason === r;
              return (
                <button
                  key={r}
                  className="cell row"
                  style={{ border: `1px solid ${on ? "var(--color-accent)" : "transparent"}`, background: on ? "var(--color-accent-900)" : "var(--color-surface)", cursor: "pointer", textAlign: "left", color: "inherit" }}
                  onClick={() => setReason(r)}
                >
                  {on ? (
                    <i className="ph-fill ph-check-circle" style={{ fontSize: 16, color: "var(--color-accent)", flex: "none" }} />
                  ) : (
                    <div style={{ width: 16, flex: "none" }} />
                  )}
                  <div style={{ flex: 1, fontSize: 12.5, color: on ? "var(--color-accent-100)" : "var(--color-text)" }}>{r}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cell">
          <div className="scr" style={{ marginBottom: 7 }}>Goes to {state.program.coachName} as</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--color-neutral-300)" }}>
            &ldquo;Removed set {set.index} of {ex.name} — {reason.toLowerCase()}.{" "}
            {priorRemovals > 1 ? `${ordinal(priorRemovals)} removal in three sessions.` : "First removal this block."}&rdquo;
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => nav(-1)}>
              Keep the set
            </button>
            <button className="btn btn-secondary" style={{ flex: "none", height: 44, fontSize: 12.5, color: "var(--color-neutral-300)" }} onClick={confirmRemove}>
              Remove it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number) {
  if (n === 2) return "Second";
  if (n === 3) return "Third";
  return `${n}th`;
}
