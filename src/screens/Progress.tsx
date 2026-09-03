import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { TabBar } from "../components/TabBar";
import { Seg } from "../components/UI";

const BENCH_HISTORY = [52, 55, 58, 57, 64, 68, 72, 70, 80, 86, 92, 100];

function todayISO() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}
function thisWeekISO() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const monday = new Date(t);
  monday.setDate(t.getDate() - mondayIndex(t));
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

export default function Progress() {
  const { state } = useStore();
  const [tab, setTab] = useState<"strength" | "body" | "volume">("strength");

  return (
    <div className="screen">
      <div className="hdr">
        <div style={{ flex: 1 }}>
          <div className="k">{state.program.totalWeeks} weeks with {state.program.coachName}</div>
          <div className="h1">Progress</div>
        </div>
        <ViewAllLiftsButton />
      </div>
      <div className="screen-scroll">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: "strength", label: "Strength" },
            { value: "body", label: "Body" },
            { value: "volume", label: "Volume" },
          ]}
        />

        {tab === "strength" && <StrengthTab />}
        {tab === "body" && <BodyTab />}
        {tab === "volume" && <VolumeTab />}
      </div>
      <TabBar />
    </div>
  );
}

function ViewAllLiftsButton() {
  const nav = useNavigate();
  return (
    <button className="btn btn-secondary btn-icon" onClick={() => nav("/progress/lifts")} aria-label="See every lift in the mesocycle">
      <i className="ph ph-list-magnifying-glass" style={{ fontSize: 17, color: "var(--color-neutral-400)" }} />
    </button>
  );
}

function StrengthTab() {
  const { state } = useStore();
  const nav = useNavigate();
  const max = Math.max(...BENCH_HISTORY);
  return (
    <>
      <div className="cell elev-sm">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-heading)", fontWeight: 500 }}>Bench press</div>
            <div className="mu" style={{ marginTop: 2 }}>Est. 1RM · 12 weeks</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, color: "var(--color-accent-300)" }}>{BENCH_HISTORY[BENCH_HISTORY.length - 1]}</div>
            <div className="mu">{state.profile.units} · +{BENCH_HISTORY[BENCH_HISTORY.length - 1] - BENCH_HISTORY[0]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 78, marginTop: 12 }}>
          {BENCH_HISTORY.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(v / max) * 100}%`,
                borderRadius: "3px 3px 0 0",
                background: i > 8 ? "var(--color-accent)" : i > 5 ? "var(--color-accent-600)" : i > 2 ? "var(--color-accent-700)" : "var(--color-accent-800)",
              }}
            />
          ))}
        </div>
        <div className="row" style={{ marginTop: 7, fontSize: 10, color: "var(--color-neutral-600)" }}>
          <span>wk 1</span>
          <span style={{ marginLeft: "auto" }}>wk 12</span>
        </div>
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="sh" style={{ flex: 1, margin: 0 }}>Main lifts</div>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-accent)", padding: 0 }} onClick={() => nav("/progress/lifts")}>
            See every lift
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { name: "Squat", value: "148", pct: "+11%", spark: [40, 55, 70, 100] },
            { name: "Deadlift", value: "182", pct: "+7%", spark: [55, 62, 78, 88] },
            { name: "Pull-Up", value: "6 unassisted", pct: "+2 reps", spark: [20, 40, 60, 100] },
          ].map((l) => (
            <div key={l.name} className="cell row" style={{ padding: "11px 12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>{l.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>{l.value} {l.name === "Pull-Up" ? "" : `${state.profile.units} est. 1RM`}</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
                {l.spark.map((h, i) => (
                  <div key={i} style={{ width: 4, height: `${h}%`, background: i === l.spark.length - 1 ? "var(--color-accent)" : "var(--color-accent-700)", borderRadius: 1 }} />
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--color-accent-300)", width: 52, textAlign: "right" }}>{l.pct}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="sh">Records this block</div>
        <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row" style={{ fontSize: 12.5 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Bench press</span>
            <span>100 {state.profile.units} × 6 · wk 12</span>
          </div>
          <div className="row" style={{ fontSize: 12.5 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Pull-up, unassisted</span>
            <span>6 reps · wk 11</span>
          </div>
        </div>
      </div>
    </>
  );
}

function BodyTab() {
  const { state, dispatch } = useStore();
  const p = useEffectiveProfile();
  const today = todayISO();
  const [logging, setLogging] = useState(false);
  const [weightInput, setWeightInput] = useState(String(p.bodyweight));

  const history = state.weighIns.slice(-14); // most recent ~14 logged weigh-ins
  const values = history.map((w) => w.weight);
  const max = Math.max(...values, p.bodyweight);
  const min = Math.min(...values, p.bodyweight);
  const points = history
    .map((w, i) => {
      const x = history.length > 1 ? (i / (history.length - 1)) * 96 + 2 : 50;
      const y = 34 - ((w.weight - min) / (max - min || 1)) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  const latest = history[history.length - 1]?.weight ?? p.bodyweight;
  const first = history[0]?.weight ?? latest;
  const totalChange = Math.round((latest - first) * 10) / 10;
  const weeks = Math.max(1, history.length / (p.weighInsPerWeek || 3));
  const ratePerWeek = Math.round((totalChange / weeks) * 10) / 10;

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekDates = thisWeekISO();
  const byDate = new Map(state.weighIns.map((w) => [w.date, w.weight]));
  const loggedToday = byDate.has(today);

  function submitWeighIn() {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      dispatch({ type: "LOG_WEIGHIN", date: today, weight: w });
      dispatch({ type: "SHOW_TOAST", message: "Weigh-in logged." });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2200);
    }
    setLogging(false);
  }

  return (
    <>
      {p.weighInsPerWeek > 0 && (
        <div className="row" style={{ gap: 8, padding: "10px 11px", borderRadius: 8, background: "var(--color-accent-900)" }}>
          <i className="ph ph-scales" style={{ fontSize: 16, color: "var(--color-accent)", flex: "none" }} />
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: "var(--color-accent-200)" }}>
            {p.weighInsPerWeek}× a week — {p.weighInDays.join(", ")}, first thing.
          </div>
          {!loggedToday && !logging && (
            <button className="btn btn-primary" style={{ flex: "none", height: 34, fontSize: 12.5 }} onClick={() => setLogging(true)}>
              Log
            </button>
          )}
        </div>
      )}

      {logging && (
        <div className="cell row" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            autoFocus
          />
          <span className="mu">{p.units}</span>
          <button className="btn btn-primary" style={{ height: 36, fontSize: 12.5 }} onClick={submitWeighIn}>
            Save
          </button>
        </div>
      )}

      <div className="cell elev-sm">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Trend weight</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 28, lineHeight: 1.1, marginTop: 3 }}>
              {latest.toFixed(1)} <span style={{ fontSize: 14, color: "var(--color-neutral-500)" }}>{p.units}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: ratePerWeek <= 0 ? "var(--color-accent-300)" : "var(--color-neutral-300)" }}>
              {ratePerWeek > 0 ? "+" : ""}
              {ratePerWeek} {p.units}/wk
            </div>
            <div className="mu" style={{ marginTop: 2 }}>
              {totalChange > 0 ? "+" : ""}
              {totalChange} total
            </div>
          </div>
        </div>
        {history.length > 1 ? (
          <div style={{ position: "relative", height: 76, marginTop: 14 }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 4 }}>
              {history.map((w, i) => (
                <div key={i} style={{ flex: 1, height: `${((w.weight - min) / (max - min || 1)) * 80 + 15}%`, background: "var(--color-neutral-900)", borderRadius: 2 }} />
              ))}
            </div>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <polyline points={points} fill="none" stroke="#4ce08f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="mu" style={{ marginTop: 14, textAlign: "center", padding: "20px 0" }}>Log a weigh-in to start the chart.</div>
        )}
        <div className="row" style={{ marginTop: 8, fontSize: 10, color: "var(--color-neutral-600)" }}>
          <span>{history[0] ? new Date(history[0].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
          <span style={{ marginLeft: "auto" }}>each point is a logged weigh-in</span>
        </div>
      </div>

      {p.weighInsPerWeek > 0 && (
        <div>
          <div className="sh">This week's weigh-ins</div>
          <div className="cell">
            <div style={{ display: "flex", gap: 6 }}>
              {weekdays.map((d, i) => {
                const date = weekDates[i];
                const due = p.weighInDays.includes(d);
                const isToday = date === today;
                const loggedWeight = byDate.get(date);
                return (
                  <div key={d} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        height: 44,
                        borderRadius: 8,
                        border: `1px ${loggedWeight !== undefined ? "solid" : isToday ? "solid" : due ? "dashed" : "solid"} ${loggedWeight !== undefined ? "var(--color-accent-700)" : isToday ? "var(--color-accent)" : due ? "var(--color-neutral-700)" : "transparent"}`,
                        background: loggedWeight !== undefined ? "var(--color-accent-900)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: loggedWeight !== undefined ? "var(--color-accent-200)" : isToday ? "var(--color-accent)" : "var(--color-neutral-700)",
                        fontSize: 12,
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {loggedWeight !== undefined ? loggedWeight.toFixed(1) : isToday ? <i className="ph ph-plus" style={{ fontSize: 14 }} /> : due ? <i className="ph ph-minus" style={{ fontSize: 14 }} /> : ""}
                    </div>
                    <div className="scr" style={{ marginTop: 4, color: isToday ? "var(--color-accent)" : undefined }}>{d[0]}</div>
                  </div>
                );
              })}
            </div>
            <div className="mu" style={{ marginTop: 10, lineHeight: 1.5 }}>Miss two in a week and {state.program.coachName} is notified — the trend line needs the density to stay honest.</div>
          </div>
        </div>
      )}

      <div>
        <div className="sh">Also tracked</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="cell" style={{ flex: 1, padding: 11 }}>
            <div className="scr">Waist</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginTop: 3 }}>
              81 <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>cm</span>
            </div>
            <div className="mu" style={{ marginTop: 2 }}>+2 since wk 1</div>
          </div>
          <div className="cell" style={{ flex: 1, padding: 11 }}>
            <div className="scr">Photos</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginTop: 3 }}>wk 8</div>
            <div className="mu" style={{ marginTop: 2 }}>next due wk 12</div>
          </div>
        </div>
      </div>
    </>
  );
}

function VolumeTab() {
  const muscles = [
    { name: "Chest", sets: 14, mev: 8, mrv: 18 },
    { name: "Back", sets: 16, mev: 10, mrv: 20 },
    { name: "Triceps", sets: 10, mev: 6, mrv: 16 },
    { name: "Side delts", sets: 9, mev: 8, mrv: 16 },
    { name: "Quads", sets: 12, mev: 8, mrv: 18 },
  ];
  return (
    <div>
      <div className="sh">Sets per muscle this week</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {muscles.map((m) => {
          const pct = Math.min(100, (m.sets / m.mrv) * 100);
          const mevPct = (m.mev / m.mrv) * 100;
          const atOrOver = m.sets >= m.mrv;
          return (
            <div key={m.name} className="cell" style={{ padding: 11 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{m.name}</span>
                <span style={{ fontSize: 12, color: atOrOver ? "var(--color-neutral-300)" : "var(--color-accent-300)", fontFamily: "var(--font-heading)" }}>{m.sets} sets</span>
              </div>
              <div className="meter" style={{ position: "relative" }}>
                <div className="meter-fill" style={{ width: `${pct}%`, background: atOrOver ? "var(--color-neutral-400)" : "var(--color-accent)" }} />
                <div style={{ position: "absolute", top: -2, bottom: -2, left: `${mevPct}%`, width: 1, background: "var(--color-neutral-400)" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mu" style={{ marginTop: 10, lineHeight: 1.6 }}>The tick marks minimum effective volume; the bar fills toward your maximum recoverable volume. Dana adjusts next week's numbers — this is just the evidence.</div>
    </div>
  );
}
