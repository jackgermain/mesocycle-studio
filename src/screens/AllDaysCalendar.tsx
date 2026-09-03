import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { CloseHeader } from "../components/UI";
import { phaseLabelForWeek } from "../data/phaseLabels";
import { dayNumberInWeek } from "../data/dayNumbering";
import type { DayStatus, TrainingDay } from "../data/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseISO(iso: string): Date {
  return new Date(iso + "T00:00:00");
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** Monday-indexed weekday: 0=Mon .. 6=Sun */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function mondayOf(d: Date): Date {
  return addDays(d, -mondayIndex(d));
}
function todayISO(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return iso(t);
}

function dotColor(status: DayStatus): string {
  if (status === "done") return "var(--color-accent)";
  if (status === "today") return "var(--color-accent)";
  return "var(--color-neutral-600)";
}

type Entry = { day: TrainingDay; weekNumber: number; phase: string };

export default function AllDaysCalendar() {
  const { state } = useStore();
  const nav = useNavigate();
  const today = todayISO();

  const byDate = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const w of state.program.weeks) {
      for (const d of w.days) {
        map.set(d.date, { day: d, weekNumber: w.number, phase: phaseLabelForWeek(state.program, w) });
      }
    }
    return map;
  }, [state.program]);

  const todayDate = parseISO(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const { weeks: gridRows, monthLabel } = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0);
    const gridStart = mondayOf(monthStart);
    const gridEndExclusive = addDays(mondayOf(monthEnd), 7); // start of the week after the month's last week
    const totalDays = Math.round((gridEndExclusive.getTime() - gridStart.getTime()) / 86400000);
    const rowCount = totalDays / 7; // 4, 5, or 6 — a real month grid, never padded past what the month needs

    const weeks: { date: string; inMonth: boolean; entry?: Entry }[][] = [];
    for (let r = 0; r < rowCount; r++) {
      const row: { date: string; inMonth: boolean; entry?: Entry }[] = [];
      for (let c = 0; c < 7; c++) {
        const d = addDays(gridStart, r * 7 + c);
        const dateStr = iso(d);
        row.push({ date: dateStr, inMonth: d.getMonth() === viewMonth, entry: byDate.get(dateStr) });
      }
      weeks.push(row);
    }

    return { weeks, monthLabel: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }, [viewYear, viewMonth, byDate]);

  return (
    <div className="screen">
      <CloseHeader kicker={state.program.name} title="Whole mesocycle" />
      <div className="screen-scroll">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30 }} onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <i className="ph ph-caret-left" style={{ fontSize: 14 }} />
          </button>
          <span style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{monthLabel}</span>
          <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30 }} onClick={() => shiftMonth(1)} aria-label="Next month">
            <i className="ph ph-caret-right" style={{ fontSize: 14 }} />
          </button>
        </div>
        <div className="mu" style={{ textAlign: "center" }}>Nothing here is locked — browse ahead any time</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="scr" style={{ textAlign: "center" }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {gridRows.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {row.map((cell) => {
                const d = parseISO(cell.date);
                const isToday = cell.date === today;
                const entry = cell.entry;

                if (!entry) {
                  return (
                    <div key={cell.date} style={{ aspectRatio: "1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: cell.inMonth ? 1 : 0.25 }}>
                      <span style={{ fontSize: 11, color: isToday ? "var(--color-accent)" : "var(--color-neutral-600)" }}>{d.getDate()}</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={cell.date}
                    onClick={() => nav(`/block/day/${entry.day.id}`)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      cursor: "pointer",
                      opacity: cell.inMonth ? 1 : 0.45,
                      border: isToday ? "1.5px solid var(--color-accent)" : "1px solid var(--color-divider)",
                      background: entry.day.status === "today" || entry.day.status === "done" ? "var(--color-accent-900)" : "var(--color-surface)",
                      color: "var(--color-text)",
                      padding: 0,
                    }}
                  >
                    <span style={{ fontSize: 12, fontFamily: "var(--font-heading)", color: isToday ? "var(--color-accent-100)" : "var(--color-text)" }}>{d.getDate()}</span>
                    <span style={{ fontSize: 8, color: "var(--color-neutral-500)" }}>D{dayNumberInWeek(entry.day)}</span>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: dotColor(entry.day.status) }} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div>
          <div className="sh">Legend</div>
          <div className="row" style={{ gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--color-neutral-500)" }}>
            <span className="row" style={{ gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} /> done / today
            </span>
            <span className="row" style={{ gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-neutral-600)" }} /> upcoming
            </span>
            <span className="row" style={{ gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px solid var(--color-accent)" }} /> today's date
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
