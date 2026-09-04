import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { InfoBanner } from "../components/UI";
import { pumpWording, jointReasonLabels } from "../data/mockData";
import { dayDisplayTitle } from "../data/dayNumbering";
import { useAuth } from "../lib/auth";
import { isJointAlerting, isJointUrgent, isPumpAlerting, sendSignals } from "../shared/signals";

const COMMON_AREAS = ["R shoulder", "L shoulder", "Elbow", "Wrist", "Lower back", "Knee", "Hip"];

// The three things a coach asks next anyway, and each one changes the answer.
//
// Which sets: pain that only shows up in warm-ups is usually a warm-up problem, not a movement problem.
// Where in the lift: pain in the stretch and pain at lockout point at different things entirely.
// How it progressed: this is the one that decides whether to keep training it at all. Pain that warms up
// and fades is a very different animal from pain that builds set over set, even at the same severity.
//
// All offered as chips, because this is answered standing in a gym with a phone in one hand.
const SET_SCOPES = ["Warm-ups only", "Warm-ups and working sets", "Working sets only", "Every set"];
const REP_MOMENTS = ["Bottom / stretch", "Middle of the rep", "Top / lockout", "Lowering it", "All the way through"];
const PROGRESSIONS = ["Warmed up and faded", "Stayed the same", "Built up each set", "Worse after I finished"];
const NOT_ONE_EXERCISE = "Not one exercise";

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

  // What they actually trained today, in the order they did it -- the candidate causes of any pain.
  const exerciseNames = useMemo(() => {
    if (!day) return [];
    const names = day.order.map((id) => day.exercises[id]?.name).filter((n): n is string => !!n);
    return Array.from(new Set(names));
  }, [day]);

  const [step, setStep] = useState<"pump" | "joint">("pump");
  const [pump, setPump] = useState<Record<string, number>>({});
  const [jointYes, setJointYes] = useState<boolean | null>(null);
  const [jointSeverity, setJointSeverity] = useState<number | null>(null);
  const [jointLocation, setJointLocation] = useState("");
  const [jointExercise, setJointExercise] = useState("");
  const [setScope, setSetScope] = useState("");
  const [repMoment, setRepMoment] = useState("");
  const [progression, setProgression] = useState("");
  const [jointDetail, setJointDetail] = useState("");

  if (!day) return <div className="screen-scroll">Not found.</div>;

  const pumpDone = muscles.every(([m]) => pump[m] !== undefined);
  const jointGateAnswered = jointYes !== null;
  const jointDetailNeeded = jointYes === true;
  // Anything at 2 or above reaches the coach, so that's where it's worth insisting on enough to act on.
  // Each of these is a single tap and only ever asked of someone who just said they're in pain; a half
  // answered report is what made these useless to act on before. A 1 is noted and needs nothing.
  const jointDetailDone =
    !jointDetailNeeded ||
    (jointSeverity !== null &&
      (jointSeverity < 2 ||
        (jointLocation.trim().length > 0 &&
          (exerciseNames.length === 0 || jointExercise.length > 0) &&
          setScope.length > 0 &&
          repMoment.length > 0 &&
          progression.length > 0)));
  const canFinish = jointGateAnswered && jointDetailDone;

  // The free-form half of the report, assembled from the chips and whatever they typed.
  const composedDetail = [setScope, repMoment, progression, jointDetail.trim()].filter(Boolean).join(" · ");

  function finish() {
    dispatch({ type: "SET_FEEDBACK_DONE", dayId });

    // Only what the coach actually needs to act on gets sent -- a good pump on every muscle isn't news.
    const dayLabel = day ? dayDisplayTitle(day) : null;
    const signals = [
      ...muscles
        .map(([muscle]) => ({ muscle, severity: pump[muscle] }))
        .filter((p) => typeof p.severity === "number" && isPumpAlerting(p.severity))
        .map((p) => ({ kind: "pump" as const, muscle: p.muscle, severity: p.severity, dayLabel })),
      ...(jointYes && jointSeverity !== null && isJointAlerting(jointSeverity)
        ? [{
            kind: "joint" as const,
            muscle: null,
            severity: jointSeverity,
            // note stays the body area alone, which is what recurrence is matched on -- the detail below
            // varies session to session and would hide a repeat of the same complaint.
            note: jointLocation.trim() || jointReasonLabels[jointSeverity - 1] || null,
            exercise: jointExercise && jointExercise !== NOT_ONE_EXERCISE ? jointExercise : null,
            detail: composedDetail || null,
            dayLabel,
            dayId,
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

            {exerciseNames.length > 0 && (
              <div>
                <div className="sh">Which exercise?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {exerciseNames.map((n) => (
                    <button key={n} className={`chip${jointExercise === n ? " on" : ""}`} onClick={() => setJointExercise(n)}>
                      {n}
                    </button>
                  ))}
                  <button className={`chip${jointExercise === NOT_ONE_EXERCISE ? " on" : ""}`} onClick={() => setJointExercise(NOT_ONE_EXERCISE)}>
                    {NOT_ONE_EXERCISE}
                  </button>
                </div>
                <div className="mu" style={{ marginTop: 6 }}>Required when pain is 2 or higher — it's what lets your coach change the movement.</div>
              </div>
            )}

            <div>
              <div className="sh">Which sets did it happen on?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SET_SCOPES.map((v) => (
                  <button key={v} className={`chip${setScope === v ? " on" : ""}`} onClick={() => setSetScope(setScope === v ? "" : v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sh">Where in the lift did it hurt?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {REP_MOMENTS.map((v) => (
                  <button key={v} className={`chip${repMoment === v ? " on" : ""}`} onClick={() => setRepMoment(repMoment === v ? "" : v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sh">Did it settle as you went?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PROGRESSIONS.map((v) => (
                  <button key={v} className={`chip${progression === v ? " on" : ""}`} onClick={() => setProgression(progression === v ? "" : v)}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="mu" style={{ marginTop: 6 }}>Pain that warms up and fades means something different from pain that builds.</div>
            </div>

            <div className="field">
              <label>Anything else worth knowing?</label>
              <textarea
                className="input"
                style={{ minHeight: 76, lineHeight: 1.5 }}
                value={jointDetail}
                onChange={(e) => setJointDetail(e.target.value)}
                placeholder="e.g. only once I got past 185, fine again after I dropped the weight"
              />
              <div className="mu" style={{ marginTop: 6 }}>Optional.</div>
            </div>

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
