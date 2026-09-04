import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { BackHeader, InfoBanner, StatCell } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle, dayKicker } from "../data/dayNumbering";
import DayWorkout from "./DayWorkout";
import UpcomingDay from "./UpcomingDay";
import Soreness from "./Soreness";
import { ExerciseSection } from "./ExerciseSection";
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
          <StatCell label="Tonnage" value={day.log?.tonnage ?? "—"} />
          <StatCell label="Time" value={day.log ? `${day.log.timeMin}m` : "—"} />
          <StatCell label="Pump" value={day.log?.pumpAvg ?? "—"} valueColor="var(--color-accent-300)" />
        </div>

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return <ExerciseSection key={id} index={i + 1} dayId={dayId} ex={ex} readOnly="past" />;
        })}

        <div>
          <div className="sh">Your feedback that day</div>
          <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="row" style={{ fontSize: 12.5 }}>
              <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Overall pump</span>
              <span style={{ color: "var(--color-accent-300)" }}>{day.log?.pumpAvg ?? "—"} · good</span>
            </div>
            <div className="row" style={{ fontSize: 12.5 }}>
              <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Joint pain</span>
              <span style={{ color: "var(--color-neutral-200)" }}>None reported</span>
            </div>
          </div>
        </div>

        <InfoBanner icon="ph-lock-simple">Logged sessions are read-only after 24 hours. Ask {state.program.coachName} to correct anything wrong.</InfoBanner>
      </div>
      <TabBar />
    </div>
  );
}
