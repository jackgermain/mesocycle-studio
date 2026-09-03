import React from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { BackHeader, InfoBanner } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle } from "../data/dayNumbering";
import { ExerciseSection } from "./ExerciseSection";

function friendlyDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function daysAway(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 1) return "Tomorrow";
  if (diff <= 0) return "Today";
  return `In ${diff} days`;
}

/** Same exercise card component as today's workout screen (ExerciseSection, in read-only mode) -- a
 * future day used to render its own plain read-only list here, so it looked like a different, simpler app
 * depending on which arrow you tapped. Weight/reps stay editable (adjusting a specific day's target ahead
 * of time is harmless); only ticking a set done is disabled, since you can't log a workout that hasn't
 * happened yet. */
export default function UpcomingDay({ dayId }: { dayId: string }) {
  const { state } = useStore();
  const nav = useNavigate();
  const { account, previewingAsClient } = useAuth();
  const selfDirected = account?.role === "friend" || previewingAsClient;
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  return (
    <div className="screen">
      <BackHeader
        kicker={`${friendlyDate(day.date)} · Week ${week.number}`}
        title={dayDisplayTitle(day)}
        right={<DayNavControls dayId={dayId} />}
        onBack={selfDirected ? () => nav("/build") : undefined}
      />
      <div className="screen-scroll">
        <InfoBanner icon="ph-eye">
          {day.setCount > 0
            ? `${daysAway(day.date)} · ${day.setCount} sets${day.muscleSummary ? ` · ${day.muscleSummary}` : ""}. You can look ahead any time — this unlocks for logging on the day.`
            : `${daysAway(day.date)} · nothing added to this day yet.`}
        </InfoBanner>

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return <ExerciseSection key={id} index={i + 1} dayId={dayId} ex={ex} readOnly="future" />;
        })}
      </div>
      <TabBar />
    </div>
  );
}
