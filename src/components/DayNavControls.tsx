import React from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";

/** Prev-day / calendar / next-day cluster shown on every day screen — the calendar jumps anywhere in the block, the arrows step one day at a time. */
export function DayNavControls({ dayId }: { dayId: string }) {
  const { state } = useStore();
  const nav = useNavigate();
  const allDays = state.program.weeks.flatMap((w) => w.days);
  const idx = allDays.findIndex((d) => d.id === dayId);
  const prev = idx > 0 ? allDays[idx - 1] : null;
  const next = idx !== -1 && idx < allDays.length - 1 ? allDays[idx + 1] : null;

  return (
    <div className="row" style={{ gap: 2, flex: "none" }}>
      <button
        onClick={() => prev && nav(`/block/day/${prev.id}`)}
        disabled={!prev}
        aria-label="Previous day"
        style={{ background: "none", border: "none", display: "flex", padding: 7, color: "var(--color-neutral-300)", cursor: prev ? "pointer" : "default", opacity: prev ? 1 : 0.3 }}
      >
        <i className="ph ph-caret-left" style={{ fontSize: 17 }} />
      </button>
      <button
        onClick={() => nav("/block/calendar")}
        aria-label="Open calendar"
        style={{ background: "none", border: "none", display: "flex", padding: 7, color: "var(--color-neutral-300)", cursor: "pointer" }}
      >
        <i className="ph ph-calendar" style={{ fontSize: 18 }} />
      </button>
      <button
        onClick={() => next && nav(`/block/day/${next.id}`)}
        disabled={!next}
        aria-label="Next day"
        style={{ background: "none", border: "none", display: "flex", padding: 7, color: "var(--color-neutral-300)", cursor: next ? "pointer" : "default", opacity: next ? 1 : 0.3 }}
      >
        <i className="ph ph-caret-right" style={{ fontSize: 17 }} />
      </button>
    </div>
  );
}
