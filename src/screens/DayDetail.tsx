import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { BackHeader, StatCell } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle, dayKicker } from "../data/dayNumbering";
import { pumpWording, jointReasonLabels } from "../data/mockData";
import { muscleColorVar } from "../shared/muscleColor";
import DayWorkout from "./DayWorkout";
import UpcomingDay from "./UpcomingDay";
import Soreness from "./Soreness";
import { ExerciseSection } from "./ExerciseSection";
import { ProgressionToggle } from "../shared/AutomationToggles";
import { computeSorenessDue } from "../shared/soreness";
import { isoToday } from "../shared/dayStatus";

export default function DayDetail() {
  const { dayId = "" } = useParams();
  const { state } = useStore();
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day } = found;

  if (day.status === "done") return <ReopenedDay dayId={dayId} />;
  if (day.status === "today") {
    // Only ask about recovery on the session's real calendar day. "today" status is broader than that --
    // it also covers a session opened early (when today is a rest day, the next one opens so you can
    // still train) and a missed day being caught up later. Asking "has this healed?" in either case
    // answers for the wrong point in time: a day early the recovery window hasn't elapsed yet, and days
    // late the answer no longer describes how the muscle felt going into that session.
    if (!day.sorenessDone && day.date === isoToday()) {
      const due = computeSorenessDue(state.program, dayId);
      if (due.length > 0) return <Soreness dayId={dayId} due={due} />;
    }
    return <DayWorkout dayId={dayId} />;
  }
  return <UpcomingDay dayId={dayId} />;
}

/** What was actually answered at the end of that session.
 *
 * Every line here used to be fiction. "Overall pump" printed `pumpAvg`, which the reducer wrote as the
 * literal number 4 on every session ever finished, and "Joint pain" printed the fixed string "None
 * reported" whatever had been said — including on a day someone reported a joint that stopped a set. The
 * finish flow was asking both questions and throwing the answers away.
 *
 * A session finished before the answers were stored has no `pump`, and says so rather than inventing a
 * number. That is a different state from `joint: null`, which means asked and answered "no pain". */
function FeedbackThatDay({ log }: { log?: import("../data/types").DayLog }) {
  const pump = log?.pump;
  const rated = pump ? Object.entries(pump).filter(([, v]) => typeof v === "number") : [];
  const joint = log?.joint;

  return (
    <div>
      <div className="sh">Your feedback that day</div>
      <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ fontSize: 12.5 }}>
          <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Overall pump</span>
          <span style={{ color: rated.length ? "var(--color-accent-300)" : "var(--color-neutral-400)" }}>
            {rated.length ? `${log!.pumpAvg} · ${pumpWording[Math.round(log!.pumpAvg) - 1] ?? ""}` : "Not recorded"}
          </span>
        </div>
        {/* Per muscle, because a 5 on one and a 2 on another average to something that describes neither. */}
        {rated.map(([muscle, score]) => (
          <div key={muscle} className="row" style={{ fontSize: 12, paddingLeft: 10 }}>
            <span style={{ flex: 1, color: muscleColorVar(muscle) }}>{muscle}</span>
            <span className="mu">{score} · {pumpWording[score - 1] ?? ""}</span>
          </div>
        ))}
        <div className="row" style={{ fontSize: 12.5, alignItems: "flex-start" }}>
          <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Joint pain</span>
          <span style={{ color: joint ? "var(--color-danger, #e5484d)" : "var(--color-neutral-200)", textAlign: "right", maxWidth: "62%" }}>
            {joint === undefined
              ? "Not recorded"
              : joint === null
                ? "None reported"
                : [joint.location, jointReasonLabels[joint.severity - 1]].filter(Boolean).join(" — ")}
          </span>
        </div>
        {joint?.detail && (
          <div className="mu" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {joint.detail}{joint.exercise ? ` · on ${joint.exercise}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function ReopenedDay({ dayId }: { dayId: string }) {
  const { state } = useStore();
  const nav = useNavigate();
  const { account, previewingAsClient } = useAuth();
  const selfDirected = account?.role === "friend" || previewingAsClient;
  const found = findDay(state.program, dayId);
  if (!found) return null;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  return (
    <div className="screen">
      <BackHeader
        kicker={`${dayKicker(day, week.number)} · logged`}
        title={dayDisplayTitle(day)}
        right={<DayNavControls dayId={dayId} />}
        onBack={selfDirected ? () => nav("/build") : undefined}
      />
      <div className="screen-scroll">
        <div className="cell row" style={{ gap: 8 }}>
          <StatCell label="Sets" value={`${day.log?.sessionSets ?? 0}/${day.log?.sessionTotal ?? 0}`} />
          {/* Tonnage and Time used to sit here. Neither was ever measured: finishing a session wrote the
              constants "12.4t" and 48 minutes, so every logged day in the app showed the same two numbers.
              Jack: "remove the time thing cause we don't need that at all, and then we also don't need
              tonnage as well." Don't bring them back without a real source for either. */}
          {/* Em dash, not 0, when nothing was rated -- a session finished before the answers were stored
              has no pump, and printing a number for it is how this screen came to show 4 for everyone. */}
          <StatCell label="Pump" value={day.log?.pump ? day.log.pumpAvg : "—"} valueColor="var(--color-accent-300)" />
        </div>

        <ProgressionToggle />

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return <ExerciseSection key={id} index={i + 1} dayId={dayId} ex={ex} readOnly="past" />;
        })}

        <FeedbackThatDay log={day.log} />

      </div>
      <TabBar />
    </div>
  );
}
