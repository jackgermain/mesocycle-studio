import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { InfoBanner } from "../components/UI";
import { sorenessWording } from "../data/mockData";
import { dayDisplayTitle } from "../data/dayNumbering";
import { useAuth } from "../lib/auth";
import { isSorenessAlerting, sendSignals } from "../shared/signals";

export default function Soreness({ dayId, due }: { dayId: string; due: { muscle: string; lastTrainedDaysAgo: number }[] }) {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const found = findDay(state.program, dayId);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allAnswered = due.every((m) => answers[m.muscle] !== undefined);
  const anyUnhealed = due.some((m) => (answers[m.muscle] ?? 5) <= 2);

  function submit() {
    dispatch({ type: "SET_SORENESS_DONE", dayId });

    // A muscle still sore on the day it's due to be trained again is the signal that its volume may be
    // too high -- that's the whole reason this question is asked, so it has to reach the coach.
    const dayLabel = found ? dayDisplayTitle(found.day) : null;
    const sore = due
      .map((m) => ({ muscle: m.muscle, severity: answers[m.muscle], daysAgo: m.lastTrainedDaysAgo }))
      .filter((m) => typeof m.severity === "number" && isSorenessAlerting(m.severity))
      .map((m) => ({
        kind: "soreness" as const,
        muscle: m.muscle,
        severity: m.severity,
        note: `Still sore ${m.daysAgo} day${m.daysAgo === 1 ? "" : "s"} after training it`,
        dayLabel,
      }));
    if (account) void sendSignals(account.id, account.coach_id, sore);

    if (anyUnhealed) {
      dispatch({ type: "SHOW_TOAST", message: `Noted — those sets hold at last week's number, and ${state.program.coachName}'s flagged.` });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3200);
    }
    nav(`/block/day/${dayId}`, { replace: true });
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div className="k">{found ? dayDisplayTitle(found.day) : ""} · Week {found?.week.number}</div>
          <div className="h1">Before you start</div>
        </div>
      </div>
      <div className="screen-scroll">
        <InfoBanner icon="ph-lock-simple" tone="accent">
          Required before the first set. Answers set today's volume, so be honest rather than tough.
        </InfoBanner>
        <p className="mu" style={{ fontSize: 13, lineHeight: 1.6 }}>Are these healed since you last trained them?</p>

        {due.map((m) => (
          <div key={m.muscle} className="cell elev-sm">
            <div className="row" style={{ alignItems: "baseline", marginBottom: 9 }}>
              <div style={{ flex: 1, fontSize: 14.5, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{m.muscle}</div>
              <span className="mu">last trained {m.lastTrainedDaysAgo} days ago</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {sorenessWording.map((label, i) => {
                const v = i + 1;
                const on = answers[m.muscle] === v;
                return (
                  <button
                    key={v}
                    onClick={() => setAnswers((a) => ({ ...a, [m.muscle]: v }))}
                    style={{
                      flex: 1,
                      height: 52,
                      borderRadius: 8,
                      border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                      background: on ? "var(--color-accent-900)" : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 14.5, fontFamily: "var(--font-heading)", color: on ? "var(--color-accent-100)" : "var(--color-neutral-400)" }}>{v}</span>
                    <span style={{ fontSize: 8, color: on ? "var(--color-accent-300)" : "var(--color-neutral-600)", textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48, opacity: allAnswered ? 1 : 0.45, cursor: allAnswered ? "pointer" : "not-allowed" }} disabled={!allAnswered} onClick={submit}>
            Start session
          </button>
        </div>
      </div>
    </div>
  );
}
