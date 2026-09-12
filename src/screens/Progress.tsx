import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, getAllLifts, getLiftHistory } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { useAuth } from "../lib/auth";
import { coachOnTheOtherEnd } from "../shared/coachName";
import { TabBar } from "../components/TabBar";
import { Seg, InfoBanner, HeroHeader, HeroStat } from "../components/UI";
import { phaseStatus, RATE_WINDOW_DAYS, type PhaseStatus } from "../shared/nutritionPlan";

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
  const currentWeek = state.program.weeks.find((w) => w.days.some((d) => d.status === "today"))?.number ?? state.program.weeks[0]?.number ?? 1;

  return (
    <div className="screen">
      <HeroHeader title="Progress" />
      <div className="screen-scroll">
        <HeroStat
          value={currentWeek}
          label={<>current<br />week</>}
          rows={[
            { label: "Program length", display: `${state.program.totalWeeks} weeks` },
            { label: "Coach", display: state.program.coachName },
          ]}
        />
        {state.nextProgram && (
          <InfoBanner icon="ph-hourglass" tone="accent">
            Up next: <strong>{state.nextProgram.name}</strong> — starts automatically once you finish this block.
          </InfoBanner>
        )}
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

function StrengthTab() {
  const { state } = useStore();
  const nav = useNavigate();
  const lifts = getAllLifts(state.program).filter((l) => l.occurrences > 0);

  if (lifts.length === 0) {
    return <InfoBanner icon="ph-chart-line-up">Nothing logged yet — once you start checking off sets, your lift history shows up here.</InfoBanner>;
  }

  const featured = [...lifts].sort((a, b) => b.occurrences - a.occurrences)[0];
  const history = getLiftHistory(state.program, featured.name);
  const adherence = history.map((h) => (h.setsPrescribed > 0 ? h.setsLogged / h.setsPrescribed : 0));
  const maxAdherence = Math.max(...adherence, 0.01);

  return (
    <>
      <div className="cell elev-sm">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{featured.name}</div>
            <div className="mu" style={{ marginTop: 2 }}>Sets logged per week · {history.length} weeks</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontWeight: 700, fontSize: 14, color: "var(--color-accent-300)" }}>{featured.lastLoggedTopSet ?? "—"}</div>
            <div className="mu">last logged top set</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 78, marginTop: 12 }}>
          {adherence.map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${(v / maxAdherence) * 100}%`, borderRadius: "3px 3px 0 0", background: i === adherence.length - 1 ? "var(--color-accent)" : "var(--color-accent-700)" }} />
          ))}
        </div>
        <div className="row" style={{ marginTop: 7, fontSize: 11, color: "var(--color-neutral-600)" }}>
          <span>wk {history[0]?.weekNumber ?? 1}</span>
          <span style={{ marginLeft: "auto" }}>wk {history[history.length - 1]?.weekNumber ?? 1}</span>
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
          {lifts.slice(0, 5).map((l) => (
            <div key={l.name} className="cell row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>{l.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>{l.muscle}</div>
              </div>
              <span style={{ fontSize: 12.5, color: "var(--color-accent-300)" }}>{l.lastLoggedTopSet ?? "not logged yet"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BodyTab() {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const p = useEffectiveProfile();
  const today = todayISO();
  const [logging, setLogging] = useState(false);
  const [weightInput, setWeightInput] = useState(String(p.bodyweight));

  // The chart shows exactly the window the rate is fitted over, so the picture and the number can never
  // disagree. This used to slice the last 14 entries and divide by how MANY there were -- someone who
  // missed weigh-ins had their loss reported slower than it really was.
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RATE_WINDOW_DAYS);
  const cutoff = windowStart.toISOString().slice(0, 10);
  const history = state.weighIns.filter((w) => w.date >= cutoff);
  const latest = state.weighIns[state.weighIns.length - 1]?.weight ?? p.bodyweight;
  const first = history[0]?.weight ?? latest;
  const totalChange = Math.round((latest - first) * 10) / 10;
  const phase = phaseStatus(p.rateTargetPct, p.bodyFatPct, state.weighIns);

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
          <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5, color: "var(--color-accent-200)" }}>
            {p.weighInsPerWeek}× a week — {p.weighInDays.join(", ")}, first thing.
          </div>
          {!loggedToday && !logging && (
            <button className="btn btn-solid" style={{ flex: "none", height: 36, fontSize: 12.5 }} onClick={() => setLogging(true)}>
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
          <button className="btn btn-solid" style={{ height: 36, fontSize: 12.5 }} onClick={submitWeighIn}>
            Save
          </button>
        </div>
      )}

      <PhaseCard phase={phase} latest={latest} totalChange={totalChange} units={p.units} />
      <div className="cell elev-sm">
        <WeightTrend history={history} phase={phase} units={p.units} />
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
                      className="num"
                      style={{
                        height: 44,
                        borderRadius: 8,
                        border: `1px ${loggedWeight !== undefined ? "solid" : isToday ? "solid" : due ? "dashed" : "solid"} ${loggedWeight !== undefined ? "var(--color-accent-700)" : isToday ? "var(--color-accent)" : due ? "var(--color-neutral-700)" : "transparent"}`,
                        background: loggedWeight !== undefined ? "var(--color-accent-900)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: loggedWeight !== undefined ? "var(--color-accent-200)" : isToday ? "var(--color-accent)" : "var(--color-neutral-700)",
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
                    >
                      {loggedWeight !== undefined ? loggedWeight.toFixed(1) : isToday ? <i className="ph ph-plus" style={{ fontSize: 14 }} /> : due ? <i className="ph ph-minus" style={{ fontSize: 14 }} /> : ""}
                    </div>
                    <div className="scr" style={{ marginTop: 4, color: isToday ? "var(--color-accent)" : undefined }}>{d[0]}</div>
                  </div>
                );
              })}
            </div>
            {/* Only mentions a coach when there is one to notify. */}
            <div className="mu" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {coachOnTheOtherEnd(account?.coach_id, state.program.coachName)
                ? `Miss two in a week and ${state.program.coachName} is notified — the trend line needs the density to stay honest.`
                : "The trend line needs the density to stay honest — two a week is the minimum that works."}
            </div>
          </div>
        </div>
      )}

      <ProfileStats />

      <div>
        <div className="sh">Also tracked</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="cell" style={{ flex: 1 }}>
            <div className="scr">Waist</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, marginTop: 3 }}>
              81 <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>cm</span>
            </div>
            <div className="mu" style={{ marginTop: 2 }}>+2 since wk 1</div>
          </div>
          <div className="cell" style={{ flex: 1 }}>
            <div className="scr">Photos</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, marginTop: 3 }}>wk 8</div>
            <div className="mu" style={{ marginTop: 2 }}>next due wk 12</div>
          </div>
        </div>
      </div>
    </>
  );
}

const PHASE_TONE: Record<PhaseStatus["phase"], { fg: string; bg: string; arrow: string }> = {
  cut: { fg: "var(--color-accent-300)", bg: "var(--color-accent-900)", arrow: "▼" },
  gain: { fg: "var(--color-info)", bg: "rgba(122,162,255,.14)", arrow: "▲" },
  hold: { fg: "var(--color-neutral-400)", bg: "rgba(147,151,171,.14)", arrow: "—" },
};

/** What they're doing and whether it's working, above everything else on the tab.
 *
 * Progress opened on "current week" and a coach name and never said whether someone was cutting, gaining
 * or holding -- the one thing a person wants confirmed when they open it. The direction is read from the
 * rate they set; the speed is read from the scale. */
function PhaseCard({ phase, latest, totalChange, units }: { phase: PhaseStatus; latest: number; totalChange: number; units: string }) {
  const tone = PHASE_TONE[phase.phase];
  const fast = phase.tooFast;
  const obs = phase.observed;
  const pct = Math.min(100, Math.round((phase.capUsed ?? 0) * 100));

  return (
    <div className="cell elev-sm">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
            padding: "4px 9px", borderRadius: 999,
            background: fast ? "rgba(255,224,102,.13)" : tone.bg,
            color: fast ? "var(--color-caution)" : tone.fg,
          }}
        >
          {tone.arrow} {fast ? `${phase.label.toUpperCase()} FAST` : phase.label.toUpperCase()}
        </span>
        <span className="mu mono">{latest.toFixed(1)} {units}</span>
      </div>

      <div style={{ marginTop: 13 }}>
        <div className="scr">{totalChange === 0 ? "No change" : totalChange < 0 ? "Down" : "Up"} over the last 4 weeks</div>
        <div className="row" style={{ alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span className="num" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: tone.fg }}>
            {totalChange > 0 ? "+" : ""}{totalChange}
          </span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>{units}</span>
        </div>
      </div>

      {obs ? (
        <>
          <div style={{ height: 1, background: "var(--color-divider)", margin: "12px 0" }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="mu">Actual rate</span>
            <span className="num" style={{ fontSize: 13, fontWeight: 700, color: fast ? "var(--color-caution)" : undefined }}>
              {obs.lbPerWeek > 0 ? "+" : ""}{obs.lbPerWeek} {units}/wk · {obs.pctPerWeek > 0 ? "+" : ""}{obs.pctPerWeek}%
            </span>
          </div>
          {phase.capUsed !== null && (
            <div style={{ marginTop: 9 }}>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${pct}%`, background: fast ? "var(--color-caution)" : "var(--color-accent)" }} />
              </div>
              <div className="mu" style={{ marginTop: 7, lineHeight: 1.5, color: fast ? "var(--color-caution)" : undefined }}>
                {fast
                  ? `Past the ${phase.capPct}% a week cap. More of this is coming off as muscle — eat a bit more.`
                  : `Inside the ${phase.capPct}% a week cap.`}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mu" style={{ marginTop: 11, lineHeight: 1.5 }}>
          Not enough weigh-ins yet to call a rate — it needs about four spread over a couple of weeks.
        </div>
      )}
    </div>
  );
}

/** Raw weigh-ins as dots, the fitted trend as the line, and the rate you're allowed to lose at as a lane.
 *
 * Staying in the lane is the whole goal of a cut, so it's drawn rather than described. The old chart put
 * grey bars behind a green line and encoded the same thing twice. */
function WeightTrend({ history, phase, units }: { history: { date: string; weight: number }[]; phase: PhaseStatus; units: string }) {
  if (history.length < 2) {
    return <div className="mu" style={{ textAlign: "center", padding: "26px 0" }}>Log a weigh-in to start the chart.</div>;
  }
  const W = 340, H = 124, PAD = 14, BOT = 26;
  const ms = (d: string) => Date.parse(`${d}T00:00:00`);
  const t0 = ms(history[0].date);
  const tN = ms(history[history.length - 1].date);
  const span = Math.max(1, tN - t0);
  const weeks = span / (7 * 86400000);
  const startW = history[0].weight;

  // The lane runs from holding weight down to the cap, over the same elapsed time. Only a cut has one.
  const capLb = phase.phase === "cut" ? ((startW * phase.capPct) / 100) * weeks : 0;
  const laneLo = startW - capLb;

  const ws = history.map((h) => h.weight);
  const lo = Math.min(...ws, laneLo) - 0.4;
  const hi = Math.max(...ws, startW) + 0.4;
  const x = (d: string) => PAD + ((ms(d) - t0) / span) * (W - PAD * 2);
  const y = (w: number) => PAD + ((hi - w) / (hi - lo || 1)) * (H - PAD - BOT);

  // The least-squares line passes through the mean of the points, so the fitted rate alone places it.
  const meanW = ws.reduce((a, b) => a + b, 0) / ws.length;
  const meanT = history.reduce((a, h) => a + ms(h.date), 0) / history.length;
  const slope = (phase.observed?.lbPerWeek ?? 0) / (7 * 86400000);
  const fit = (t: number) => meanW + slope * (t - meanT);
  const fast = phase.tooFast;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="scr">Trend · last 4 weeks</span>
        <span className="mu mono">{history.length} weigh-ins</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", marginTop: 8 }} role="img"
           aria-label={`Weight trend, ${phase.observed?.lbPerWeek ?? 0} ${units} per week`}>
        <defs>
          <linearGradient id="capLane" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ce08f" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4ce08f" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {phase.phase === "cut" && (
          <>
            <path d={`M${PAD},${y(startW)} L${W - PAD},${y(startW)} L${W - PAD},${y(laneLo)} Z`} fill="url(#capLane)" />
            <line x1={PAD} y1={y(startW)} x2={W - PAD} y2={y(startW)} stroke="var(--color-neutral-800)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1={PAD} y1={y(startW)} x2={W - PAD} y2={y(laneLo)} stroke="var(--color-accent-700)" strokeWidth="1.2" strokeDasharray="4 4" />
          </>
        )}
        {history.map((h, i) => (
          <circle key={i} cx={x(h.date)} cy={y(h.weight)} r="2.6" fill="var(--color-neutral-700)" />
        ))}
        {phase.observed && (
          <polyline
            points={`${PAD},${y(fit(t0))} ${W - PAD},${y(fit(tN))}`}
            fill="none"
            stroke={fast ? "var(--color-caution)" : "var(--color-accent)"}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
        <text x={PAD} y={H - 6} fill="var(--color-text-muted)" fontFamily="var(--font-mono)" fontSize="9">
          {new Date(`${history[0].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
        <text x={W - PAD} y={H - 6} textAnchor="end" fill="var(--color-text-muted)" fontFamily="var(--font-mono)" fontSize="9">today</text>
      </svg>
      <div className="mu" style={{ marginTop: 4, lineHeight: 1.5 }}>
        {phase.phase === "cut"
          ? "Dots are what the scale said. The line is the real trend through them — staying inside the shaded lane is the whole goal."
          : "Dots are what the scale said. The line is the real trend through them."}
      </div>
    </>
  );
}

/** Height and bodyweight, changeable after onboarding.
 *
 * Both were set once on the onboarding screen and then unreachable -- there is no settings screen in the
 * app, and the only bodyweight control anywhere is the weigh-in logger above, which records a measurement
 * rather than correcting the profile figure the nutrition targets are computed from. Someone who typed
 * 5'11" when they meant 6'1", or whose starting weight was a guess, had no way back to it.
 *
 * Committed on blur rather than per keystroke: the whole client state is upserted on every change, so a
 * keystroke-level dispatch here is a write to Postgres per character. */
function ProfileStats() {
  const { dispatch } = useStore();
  const p = useEffectiveProfile();
  const [height, setHeight] = useState(p.heightLabel);
  const [weight, setWeight] = useState(String(p.bodyweight));

  function commitHeight() {
    const v = height.trim();
    if (v && v !== p.heightLabel) dispatch({ type: "UPDATE_PROFILE", profile: { heightLabel: v } });
    else setHeight(p.heightLabel);
  }

  function commitWeight() {
    const v = parseFloat(weight);
    if (!isNaN(v) && v > 0 && v !== p.bodyweight) dispatch({ type: "UPDATE_PROFILE", profile: { bodyweight: v } });
    else setWeight(String(p.bodyweight));
  }

  return (
    <div>
      <div className="sh">Your stats</div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="cell" style={{ flex: 1 }}>
          <div className="scr">Height</div>
          <input
            className="input num"
            style={{ padding: 0, border: "none", background: "none", height: 26, marginTop: 3, fontWeight: 700, fontSize: 16 }}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Height"
          />
        </div>
        <div className="cell" style={{ flex: 1 }}>
          <div className="scr">Bodyweight</div>
          <div className="row" style={{ gap: 4, alignItems: "baseline" }}>
            <input
              className="input num"
              style={{ padding: 0, border: "none", background: "none", height: 26, marginTop: 3, fontWeight: 700, fontSize: 16, flex: 1, minWidth: 0 }}
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Bodyweight"
            />
            <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>{p.units}</span>
          </div>
        </div>
      </div>
      <div className="mu" style={{ marginTop: 6, lineHeight: 1.55 }}>
        Bodyweight here is the figure your nutrition targets are worked out from — logging a weigh-in above
        doesn’t change it.
      </div>
    </div>
  );
}

function VolumeTab() {
  const { state } = useStore();
  const week = state.program.weeks.find((w) => w.days.some((d) => d.status === "today")) ?? state.program.weeks[0];

  const bySet = new Map<string, number>();
  if (week) {
    for (const day of week.days) {
      for (const ex of Object.values(day.exercises)) {
        const sets = ex.sets.filter((s) => !s.removed).length;
        bySet.set(ex.muscle, (bySet.get(ex.muscle) ?? 0) + sets);
      }
    }
  }
  const muscles = Array.from(bySet.entries())
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets);
  const max = Math.max(...muscles.map((m) => m.sets), 1);

  if (muscles.length === 0) {
    return <InfoBanner icon="ph-chart-bar">No sets prescribed yet this week — this fills in once your program has exercises assigned.</InfoBanner>;
  }

  return (
    <div>
      <div className="sh">Sets per muscle · week {week?.number}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {muscles.map((m) => (
          <div key={m.name} className="cell">
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5 }}>{m.name}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 12.5, color: "var(--color-accent-300)" }}>{m.sets} sets</span>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: `${(m.sets / max) * 100}%`, background: "var(--color-accent)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mu" style={{ marginTop: 10, lineHeight: 1.6 }}>Total prescribed sets per muscle group for this week's program.</div>
    </div>
  );
}
