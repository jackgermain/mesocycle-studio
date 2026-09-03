import React from "react";
import { useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { BackHeader, InfoBanner, StatCell } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle } from "../data/dayNumbering";
import DayWorkout from "./DayWorkout";
import UpcomingDay from "./UpcomingDay";

export default function DayDetail() {
  const { dayId = "" } = useParams();
  const { state } = useStore();
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day } = found;

  if (day.status === "done") return <ReopenedDay dayId={dayId} />;
  if (day.status === "today") return <DayWorkout dayId={dayId} />;
  return <UpcomingDay dayId={dayId} />;
}

function ReopenedDay({ dayId }: { dayId: string }) {
  const { state } = useStore();
  const found = findDay(state.program, dayId);
  if (!found) return null;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  return (
    <div className="screen">
      <BackHeader kicker={`Week ${week.number} · ${day.dow} · logged`} title={dayDisplayTitle(day)} right={<DayNavControls dayId={dayId} />} />
      <div className="screen-scroll">
        <div className="cell row" style={{ gap: 8 }}>
          <StatCell label="Sets" value={`${day.log?.sessionSets ?? 0}/${day.log?.sessionTotal ?? 0}`} />
          <StatCell label="Tonnage" value={day.log?.tonnage ?? "—"} />
          <StatCell label="Time" value={day.log ? `${day.log.timeMin}m` : "—"} />
          <StatCell label="Pump" value={day.log?.pumpAvg ?? "—"} valueColor="var(--color-accent-300)" />
        </div>

        {exIds.map((id) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return (
            <div key={id} className="cell elev-sm" style={{ padding: "11px 12px 9px" }}>
              <div className="row" style={{ marginBottom: 9 }}>
                <div style={{ flex: 1 }}>
                  <div className="name">{ex.name}</div>
                  <div className="mu" style={{ marginTop: 2 }}>{ex.metaLine}</div>
                </div>
              </div>
              {ex.sets.map((s) => (
                <div key={s.id} className="row divider" style={{ height: 34, fontSize: 12.5 }}>
                  <span className="mu" style={{ width: 14 }}>{s.index}</span>
                  {s.removed ? (
                    <span style={{ flex: 1, color: "var(--color-neutral-500)" }}>Removed · {s.removed.reason}</span>
                  ) : (
                    <>
                      <span style={{ flex: 1, color: "var(--color-neutral-300)" }}>
                        {s.actual?.load ? `${s.actual.load} ${state.profile.units} × ${s.actual.reps}` : `${s.actual?.reps ?? "—"} reps`}
                      </span>
                      <span className="mu">
                        {s.prescribed.effort.scale} {s.actual ? s.prescribed.effort.value : ""}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
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
