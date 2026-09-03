import React from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { BackHeader, InfoBanner } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle } from "../data/dayNumbering";
import { fmtLoad, typeLabel } from "./exerciseHelpers";

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
                {ex.hasVideo && <i className="ph-fill ph-play-circle" style={{ fontSize: 18, color: "var(--color-accent)" }} />}
              </div>
              {ex.sets.map((s) => (
                <div key={s.id} className="row divider" style={{ height: 32, fontSize: 12.5 }}>
                  <span className="mu" style={{ width: 14 }}>{s.index}</span>
                  <span style={{ flex: 1, color: "var(--color-neutral-300)" }}>
                    {s.prescribed.tempo || (s.prescribed.assistance && s.prescribed.assistance.type !== "none") || s.type === "cluster"
                      ? typeLabel(s.type, s)
                      : `${fmtLoad(s.prescribed.load, state.profile.units)} × ${s.prescribed.reps}`}
                  </span>
                  <span className="mu">{s.prescribed.effort.scale} {s.prescribed.effort.value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <TabBar />
    </div>
  );
}
