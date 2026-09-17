import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import type { TrainingDay } from "../data/types";
import { InfoBanner } from "../components/UI";
import { sorenessWording } from "../data/mockData";
import { dayDisplayTitle } from "../data/dayNumbering";
import { useAuth } from "../lib/auth";
import { sendSignals } from "../shared/signals";
import { buildSorenessSignals } from "../shared/sorenessSignals";
import { signalRecipient } from "../shared/signalRecipient";
import { coachOnTheOtherEnd } from "../shared/coachName";
import { judgeVolume, targetRecoveryDay } from "../generator/recoveryWindow";
import { muscleColorVar } from "../shared/muscleColor";

export default function Soreness({ dayId, due }: { dayId: string; due: { muscle: string; lastTrainedDaysAgo: number }[] }) {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const found = findDay(state.program, dayId);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // How many days after the last session the soreness stopped. Only asked when they say it healed --
  // "still sore" is already unambiguous and needs no follow-up.
  const [recovered, setRecovered] = useState<Record<string, number>>({});

  const healed = (m: string) => (answers[m] ?? 0) >= 4;
  const allAnswered = due.every(
    (m) => answers[m.muscle] !== undefined && (!healed(m.muscle) || recovered[m.muscle] !== undefined),
  );

  function submit() {
    const record: NonNullable<TrainingDay["sorenessAnswers"]> = {};
    for (const m of due) {
      record[m.muscle] = {
        severity: answers[m.muscle],
        lastTrainedDaysAgo: m.lastTrainedDaysAgo,
        ...(recovered[m.muscle] !== undefined ? { recoveredOnDay: recovered[m.muscle] } : {}),
      };
    }
    dispatch({ type: "SET_SORENESS_DONE", dayId, answers: record });

    /* EVERY answer is sent, one signal per muscle — not only the alarming ones.
     *
     * This used to send two cases: still sore (under 3) and healed early enough to add volume. An on-time
     * recovery, or a muscle that was a little sore, reached nobody. Jack: "those notifications need to be
     * being sent no matter what. They're incredibly important. It completely breaks our algorithm for
     * training if they don't work, so the coach needs to be able to see that feedback."
     *
     * `severity` is now always the real 1-5 answer (the early case used to be forced to 5), and `detail`
     * carries the gap and, when asked, the recovery day — so the desk can say which of still sore / early /
     * on time / partly recovered this was instead of inferring it from the number alone. */
    const dayLabel = found ? dayDisplayTitle(found.day) : null;
    const signals = buildSorenessSignals(due, answers, recovered, dayLabel);
    // Not `account.coach_id`: a coach training themselves has none, and every answer they gave was dropped
    // before it left the phone. Migration 0033 lets them address it to their own desk.
    const to = account ? signalRecipient(account) : null;
    if (account) void sendSignals(account.id, to, signals);

    // The old toast promised "those sets hold at last week's number". Nothing held anything: nothing in the
    // app read these answers. It now says only what is true.
    const coach = coachOnTheOtherEnd(account?.coach_id, state.program.coachName);
    dispatch({
      type: "SHOW_TOAST",
      message: coach
        ? `Noted — ${coach} has your answers.`
        : to
          ? "Noted — your answers are on your desk."
          : "Noted — saved against this session.",
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3200);
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
        <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>Are these healed since you last trained them?</p>

        {/* Same shape as the pump question at the end of a session -- heading, then a flat row of options.
            These two are the only questions in the app that ask the same thing about several muscles at
            once, so they read as one pattern rather than two. */}
        {due.map((m) => (
          <div key={m.muscle}>
            {/* Only the muscle takes the colour; the "last trained" clause stays neutral so the row does not
                read as one long coloured sentence. */}
            <div className="sh">
              <span style={{ color: muscleColorVar(m.muscle) }}>{m.muscle}</span>
              {" "}— last trained {m.lastTrainedDaysAgo} {m.lastTrainedDaysAgo === 1 ? "day" : "days"} ago
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {sorenessWording.map((label, i) => {
                const v = i + 1;
                const on = answers[m.muscle] === v;
                return (
                  <button
                    key={v}
                    className={`pill-opt${on ? " on" : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [m.muscle]: v }))}
                    style={{ height: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                  >
                    <span style={{ fontSize: 14 }}>{v}</span>
                    <span style={{ fontSize: 11, opacity: 0.85, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* The pre-session answer alone cannot tell "healed yesterday" from "healed on Tuesday", and
                those mean opposite things for volume -- the first is correct, the second means a whole
                day of growth went unbought. So ask, but only when they have said it healed. */}
            {healed(m.muscle) && (
              <div style={{ marginTop: 8 }}>
                <div className="mu" style={{ fontSize: 12.5, marginBottom: 6 }}>
                  How long did the soreness last?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Array.from({ length: m.lastTrainedDaysAgo + 1 }, (_, d) => d).map((d) => {
                    const on = recovered[m.muscle] === d;
                    const label = d === 0 ? "Never" : d === 1 ? "1 day" : `${d} days`;
                    return (
                      <button
                        key={d}
                        className={`pill-opt${on ? " on" : ""}`}
                        onClick={() => setRecovered((r) => ({ ...r, [m.muscle]: d }))}
                        // nowrap: a wrapping label makes one pill twice the height of its neighbours and the row
                        // stops reading as a single set of options.
                        style={{ height: 38, paddingInline: 12, fontSize: 12.5, whiteSpace: "nowrap" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {recovered[m.muscle] !== undefined &&
                  judgeVolume(m.lastTrainedDaysAgo, recovered[m.muscle]) === "add-volume" && (
                    <div className="mu" style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.5 }}>
                      Recovered early — ideally it would settle around day{" "}
                      {targetRecoveryDay(m.lastTrainedDaysAgo)}. Your coach will see there is room for more.
                    </div>
                  )}
              </div>
            )}
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
