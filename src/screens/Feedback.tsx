import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { InfoBanner } from "../components/UI";
import { pumpWording, jointReasonLabels } from "../data/mockData";
import { dayDisplayTitle } from "../data/dayNumbering";
import { useAuth } from "../lib/auth";
import { isJointUrgent, isPumpAlerting, sendSignals } from "../shared/signals";

const COMMON_AREAS = ["R shoulder", "L shoulder", "Elbow", "Wrist", "Lower back", "Knee", "Hip"];

export default function Feedback() {
  const { dayId = "" } = useParams();
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const found = findDay(state.program, dayId);
  const day = found?.day;

  const muscles = useMemo(() => {
    if (!day) return [];
    const set = new Map<string, number>();
    Object.values(day.exercises).forEach((ex) => {
      // "Full body" is how the library tags the olympic lifts and kettlebell swings (and cardio) -- it's a
      // movement classification, not a muscle, so "how was your Full body pump?" is a question with no
      // real answer. Everything else here is already only what was actually trained today.
      if (ex.muscle === "Full body") return;
      const sets = ex.sets.filter((s) => s.checked && !s.removed).length;
      if (sets > 0) set.set(ex.muscle, (set.get(ex.muscle) ?? 0) + sets);
    });
    return Array.from(set.entries());
  }, [day]);

  const [step, setStep] = useState<"pump" | "joint">("pump");
  const [pump, setPump] = useState<Record<string, number>>({});
  const [jointYes, setJointYes] = useState<boolean | null>(null);
  const [jointSeverity, setJointSeverity] = useState<number | null>(null);
  const [jointLocation, setJointLocation] = useState("");

  if (!day) return <div className="screen-scroll">Not found.</div>;

  const pumpDone = muscles.every(([m]) => pump[m] !== undefined);
  const jointGateAnswered = jointYes !== null;
  const jointDetailNeeded = jointYes === true;
  const jointDetailDone = !jointDetailNeeded || (jointSeverity !== null && (jointSeverity < 2 || jointLocation.trim().length > 0));
  const canFinish = jointGateAnswered && jointDetailDone;

  function finish() {
    dispatch({ type: "SET_FEEDBACK_DONE", dayId });

    // Only what the coach actually needs to act on gets sent -- a good pump on every muscle isn't news.
    const dayLabel = day ? dayDisplayTitle(day) : null;
    const signals = [
      ...muscles
        .map(([muscle]) => ({ muscle, severity: pump[muscle] }))
        .filter((p) => typeof p.severity === "number" && isPumpAlerting(p.severity))
        .map((p) => ({ kind: "pump" as const, muscle: p.muscle, severity: p.severity, dayLabel })),
      ...(jointYes && jointSeverity !== null
        ? [{
            kind: "joint" as const,
            muscle: null,
            severity: jointSeverity,
            note: jointLocation.trim() || jointReasonLabels[jointSeverity - 1] || null,
            dayLabel,
          }]
        : []),
    ];
    if (account) void sendSignals(account.id, account.coach_id, signals);

    const flagged = signals.length > 0;
    if (flagged) {
      const urgent = jointYes && isJointUrgent(jointSeverity ?? 0);
      dispatch({
        type: "SHOW_TOAST",
        message: urgent
          ? `${state.program.coachName} was notified about the joint pain right away.`
          : `${state.program.coachName} will see this before your next session.`,
      });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3200);
    }
    nav("/block", { replace: true });
  }

  if (step === "pump") {
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div className="k">{dayDisplayTitle(day)} · {Object.values(day.exercises).reduce((n, e) => n + e.sets.filter((s) => s.checked).length, 0)} sets logged</div>
            <div className="h1">How was your pump?</div>
          </div>
        </div>
        <div className="screen-scroll">
          <InfoBanner icon="ph-lock-simple" tone="accent">
            Required. This session stays open and next time stays locked until this is done — a few questions, about 30 seconds.
          </InfoBanner>
          <div className="progress-steps">
            <div className="done" />
            <div />
          </div>

          {muscles.map(([muscle, sets], i) => (
            <div key={muscle}>
              <div className="sh">{muscle} — {sets} sets{i === muscles.length - 1 && muscles.length > 1 ? "" : ""}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {pumpWording.map((label, idx) => {
                  const v = idx + 1;
                  const on = pump[muscle] === v;
                  return (
                    <button
                      key={v}
                      className={`pill-opt${on ? " on" : ""}`}
                      onClick={() => setPump((p) => ({ ...p, [muscle]: v }))}
                      style={{ height: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                    >
                      <span style={{ fontSize: 15 }}>{v}</span>
                      <span style={{ fontSize: 8.5, opacity: 0.85 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "auto", paddingBottom: 8 }}>
            <button className="btn btn-solid btn-block" style={{ height: 50, opacity: pumpDone ? 1 : 0.45, cursor: pumpDone ? "pointer" : "not-allowed" }} disabled={!pumpDone} onClick={() => setStep("joint")}>
              Next — joint check
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div className="k">Question 2 of 2</div>
          <div className="h1">Any joint pain?</div>
        </div>
      </div>
      <div className="screen-scroll">
        <div className="progress-steps">
          <div className="done" />
          <div className="done" />
        </div>
        <p className="mu" style={{ lineHeight: 1.6, fontSize: 12.5 }}>Joint, tendon or connective tissue — not muscle soreness. Muscle soreness is asked next session.</p>

        <div style={{ display: "flex", gap: 8 }}>
          <button className={`pill-opt${jointYes === false ? " on" : ""}`} onClick={() => setJointYes(false)} style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            No
          </button>
          <button className={`pill-opt${jointYes === true ? " on" : ""}`} onClick={() => setJointYes(true)} style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 15 }}>
            {jointYes === true && <i className="ph-fill ph-check-circle" style={{ fontSize: 16 }} />}
            Yes
          </button>
        </div>

        {jointYes && (
          <>
            <div>
              <div className="sh">How bad, 1–4</div>
              <div style={{ display: "flex", gap: 6 }}>
                {jointReasonLabels.map((label, i) => {
                  const v = i + 1;
                  const on = jointSeverity === v;
                  return (
                    <button
                      key={v}
                      className={`pill-opt${on ? " on" : ""}`}
                      onClick={() => setJointSeverity(v)}
                      style={{ height: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}
                    >
                      <span style={{ fontSize: 16 }}>{v}</span>
                      <span style={{ fontSize: 8.5, opacity: 0.85, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label>Where on the body?</label>
              <textarea className="input" value={jointLocation} onChange={(e) => setJointLocation(e.target.value)} placeholder="Front of right shoulder, worse on the incline press" />
              <div className="mu" style={{ marginTop: 6 }}>Required when pain is 2 or higher.</div>
            </div>

            <div>
              <div className="sh">Or tap a common area</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COMMON_AREAS.map((a) => (
                  <button key={a} className={`chip${jointLocation === a ? " on" : ""}`} onClick={() => setJointLocation(a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <InfoBanner icon="ph-paper-plane-tilt">A 3 or 4 pings {state.program.coachName} straight away instead of waiting for the weekly review.</InfoBanner>
          </>
        )}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-solid btn-block" style={{ height: 50, opacity: canFinish ? 1 : 0.45, cursor: canFinish ? "pointer" : "not-allowed" }} disabled={!canFinish} onClick={finish}>
            Finish session
          </button>
        </div>
      </div>
    </div>
  );
}
