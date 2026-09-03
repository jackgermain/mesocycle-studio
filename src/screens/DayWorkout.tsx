import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { BackHeader, InfoBanner } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle } from "../data/dayNumbering";
import { ExerciseSection } from "./ExerciseSection";

export default function DayWorkout({ dayId }: { dayId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  const totalSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.length ?? 0), 0);
  const doneSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.filter((s) => s.checked).length ?? 0), 0);
  const allResolved = totalSets > 0 && doneSets === totalSets;

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div className="screen">
      <BackHeader kicker={`Week ${week.number} · ${doneSets} of ${totalSets} sets`} title={allResolved ? "Session complete" : dayDisplayTitle(day)} right={<DayNavControls dayId={dayId} />} />
      <div className="screen-scroll" onClick={() => openMenu && setOpenMenu(null)}>
        {allResolved && (
          <InfoBanner icon="ph-check-circle" tone="accent">
            Every set is logged or removed. Finish the session to answer feedback and unlock next time.
          </InfoBanner>
        )}

        <button className="link-row" style={{ padding: "9px 12px", color: "var(--color-neutral-400)" }} onClick={() => nav(`/block/day/${dayId}/reorder`)}>
          <i className="ph ph-arrows-down-up" style={{ fontSize: 15 }} />
          <span style={{ flex: 1, fontSize: 12.5 }}>Change the order</span>
          <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
        </button>

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return (
            <ExerciseSection
              key={id}
              index={i + 1}
              dayId={dayId}
              ex={ex}
              menuOpen={openMenu === id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setOpenMenu((m) => (m === id ? null : id));
              }}
              onAddSet={() => {
                dispatch({ type: "ADD_SET", dayId, exerciseId: id });
                setOpenMenu(null);
              }}
              onAddWarmup={() => {
                dispatch({ type: "ADD_SET", dayId, exerciseId: id, warmup: true });
                setOpenMenu(null);
              }}
              onRemoveSet={() => {
                setOpenMenu(null);
                const target = ex.sets.find((s) => !s.checked) ?? ex.sets[ex.sets.length - 1];
                nav(`/block/day/${dayId}/exercise/${id}/remove/${target.id}`);
              }}
            />
          );
        })}

        <div style={{ paddingBottom: 8 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ height: 48, opacity: allResolved ? 1 : 0.45, cursor: allResolved ? "pointer" : "not-allowed" }}
            disabled={!allResolved}
            onClick={() => allResolved && nav(`/block/day/${dayId}/finish`)}
          >
            Finish session
          </button>
          {!allResolved && <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>Log or remove every set to finish · {totalSets - doneSets} left</div>}
        </div>
      </div>
      <TabBar />
    </div>
  );
}
