/** The Progress tab.
 *
 * Replaces a week number, a Strength/Body/Volume segmented control and three lists behind it. Nothing on
 * that screen said whether the week had gone well, and two thirds of it were always one tap from invisible.
 *
 * The shape here is the one Jack picked from three directions, with the corrections he gave on each pass:
 *
 * - **The week strip is the navigation.** A dot per session, so a missed week is visible without opening
 *   anything, and the deload shows as what it is. Tap a week and everything below redraws for it.
 * - **Main lifts, picked by the app, overridable by him.** One per movement pattern — see mainLifts.ts for
 *   why ranking by load alone fills a leg block's screen with squat variants.
 * - **Weight and food in ONE section**, because they are one question: is what I am eating producing the
 *   change I asked for? Answering it used to need two tabs and a memory.
 * - **The line is the WEEK AVERAGE.** *"It doesn't matter if the scale goes up for one day. What we're
 *   comparing is the week over week average."* Which is also what the rule that moves his calories reads.
 *
 * Every figure is derived on read in `progressSummary.ts` and nothing is stored, so *"make sure these
 * graphs live update when data is inputted immediately"* is a property of the design rather than a feature:
 * there is no saved copy that could disagree with the weigh-in just typed.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { TabBar } from "../components/TabBar";
import { HeroHeader, InfoBanner } from "../components/UI";
import { isoToday } from "../shared/dayStatus";
import { muscleColorVar } from "../shared/muscleColor";
import { DEFAULT_MAIN_LIFT_COUNT, liftSummaries, pickMainLifts } from "../shared/mainLifts";
import {
  blockWeeks, dailyIntake, liftMoves, weeklyDeltas, weekWeighIns, type BlockWeek,
} from "../shared/progressSummary";
import {
  SPARKLINE_BOX, deltaBar, intakeBarHeight, intakeCeiling, sparklinePath,
} from "../shared/chartGeometry";

const DAYS_IN_WEEK = 7;
const INTAKE_BOX_HEIGHT = 54;

export default function ProgressTab() {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const nav = useNavigate();
  const today = isoToday();

  const weeks = useMemo(() => blockWeeks(state.program, today), [state.program, today]);
  const currentIndex = Math.max(0, weeks.findIndex((w) => w.isCurrent));
  const [weekIndex, setWeekIndex] = useState(currentIndex);
  const [choosing, setChoosing] = useState(false);
  const week = weeks[Math.min(weekIndex, weeks.length - 1)];

  const names = useMemo(
    () => pickMainLifts(state.program, { chosen: profile.mainLifts, count: profile.mainLiftCount }),
    [state.program, profile.mainLifts, profile.mainLiftCount],
  );
  const lifts = useMemo(() => liftMoves(state.program, names, profile.units), [state.program, names, profile.units]);

  if (weeks.length === 0) {
    return (
      <div className="screen">
        <HeroHeader title="Progress" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-chart-line">
            Nothing to chart yet. This fills in as soon as you log a session or a weigh-in.
          </InfoBanner>
        </div>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="screen">
      <HeroHeader title="The block" kicker={`${state.program.name} · ${weeks.length} weeks`} />
      <div className="screen-scroll">

        <WeekStrip weeks={weeks} selected={weekIndex} onSelect={setWeekIndex} />

        <MainLifts lifts={lifts} onChoose={() => setChoosing(true)} onAll={() => nav("/progress/lifts")} />

        <WeightAndFood week={week} />

        <div className="cell row" style={{ gap: 14, alignItems: "center" }}>
          <div>
            <div className="num" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {week.sessionsDone}
              <span style={{ color: "var(--color-neutral-700)", fontSize: 15 }}>/{week.sessionsTotal}</span>
            </div>
            <div className="scr" style={{ marginTop: 1 }}>sessions</div>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-neutral-900)" }} />
          <div className="mu" style={{ flex: 1, lineHeight: 1.55 }}>
            {week.sessionsDone === week.sessionsTotal
              ? "Every session in this week is logged."
              : week.isCurrent
                ? `${week.sessionsTotal - week.sessionsDone} still to go this week.`
                : `${week.sessionsTotal - week.sessionsDone} missed in week ${week.number}.`}
          </div>
        </div>

      </div>
      {choosing && (
        <MainLiftsSheet
          onClose={() => setChoosing(false)}
          onSave={(mainLifts, mainLiftCount) => {
            dispatch({ type: "UPDATE_PROFILE", profile: { mainLifts, mainLiftCount } });
            setChoosing(false);
          }}
        />
      )}
      <TabBar />
    </div>
  );
}

/** The block, as a row of weeks. A dot per session is how a missed week becomes visible without opening it. */
function WeekStrip({ weeks, selected, onSelect }: { weeks: BlockWeek[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {weeks.map((w, i) => {
        const on = i === selected;
        return (
          <button
            key={w.number}
            onClick={() => onSelect(i)}
            aria-current={on ? "true" : undefined}
            aria-label={`Week ${w.number}, ${w.sessionsDone} of ${w.sessionsTotal} sessions logged`}
            style={{
              flex: 1, minWidth: 0, cursor: "pointer", padding: "9px 0 8px", borderRadius: 11,
              background: on ? "var(--color-accent-900)" : "var(--color-surface)",
              border: `1px solid ${on ? "var(--color-accent)" : "var(--color-neutral-900)"}`,
              borderStyle: w.isDeload ? "dashed" : "solid",
            }}
          >
            <div className="num" style={{ fontSize: 13, fontWeight: 700, color: on ? "var(--color-accent-300)" : "var(--color-neutral-400)" }}>
              {w.number}
            </div>
            {w.isDeload ? (
              <div style={{ fontSize: 8.5, color: "var(--color-neutral-600)", marginTop: 6, letterSpacing: "0.06em" }}>DELOAD</div>
            ) : (
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 5 }}>
                {Array.from({ length: Math.min(w.sessionsTotal, 6) }, (_, d) => (
                  <span
                    key={d}
                    style={{
                      width: 4, height: 4, borderRadius: "50%", display: "inline-block",
                      background: d < w.sessionsDone ? "var(--color-accent)" : "var(--color-neutral-800)",
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The geometry lives in chartGeometry.ts so it can be asserted against its own frame -- this tab shipped
 * without ever being rendered, and a mark drawn outside the viewBox looks identical in a diff.
 *
 * Writing those tests found a real defect in the version that shipped: `max - min || 1` put a FLAT series
 * along the bottom of the box, so a lift held at the same weight for three weeks was drawn as a line on the
 * floor -- which reads as a collapse. A flat series now sits on the middle line, where it means nothing
 * either way. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div style={{ width: SPARKLINE_BOX.width, flex: "none" }} />;
  const rising = values[values.length - 1] > values[0];
  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_BOX.width} ${SPARKLINE_BOX.height}`}
      style={{ width: SPARKLINE_BOX.width, height: SPARKLINE_BOX.height, flex: "none" }}
      aria-hidden="true"
    >
      <path
        d={sparklinePath(values)}
        fill="none"
        stroke={rising ? "var(--color-accent)" : "var(--color-neutral-600)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MainLifts({
  lifts, onChoose, onAll,
}: { lifts: ReturnType<typeof liftMoves>; onChoose: () => void; onAll: () => void }) {
  if (lifts.length === 0) {
    return (
      <InfoBanner icon="ph-barbell">
        No main lifts yet — these appear once you have logged a compound lift like a squat, press or row.
      </InfoBanner>
    );
  }
  return (
    <div>
      <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <div className="sh" style={{ flex: 1, margin: 0 }}>Main lifts</div>
        <button
          onClick={onChoose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-accent-300)", padding: "2px 0" }}
        >
          Choose
        </button>
      </div>
      <div className="mu" style={{ marginBottom: 8 }}>top set · vs last session</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {lifts.map((l) => (
          <div key={l.name} className="cell row" style={{ gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="trunc" style={{ fontSize: 13.5, fontWeight: 500 }}>{l.name}</div>
              <div className="num" style={{ fontSize: 12, color: "var(--color-neutral-500)", marginTop: 2 }}>{l.topSet}</div>
            </div>
            <Sparkline values={l.history} />
            <div
              className="num"
              style={{
                flex: "none", fontSize: 12.5, fontWeight: 700,
                color: l.change?.direction === "up" ? "var(--color-accent-300)" : "var(--color-neutral-500)",
              }}
            >
              {l.change?.label ?? "—"}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onAll}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--color-accent)", padding: "9px 0 0" }}
      >
        Every lift, including accessories →
      </button>
    </div>
  );
}

/** Weight and food, together, because they are one question.
 *
 * The weigh-in row shows all seven days INCLUDING the blanks: an average from three readings is a different
 * number from one built on seven, and a screen that silently averages around the gaps never says which it
 * is showing. */
function WeightAndFood({ week }: { week: BlockWeek }) {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const nav = useNavigate();
  const today = isoToday();

  const days = useMemo(() => weekWeighIns(state.weighIns, week.weekStart), [state.weighIns, week.weekStart]);
  const deltas = useMemo(() => weeklyDeltas(state.weighIns), [state.weighIns]);
  const intake = useMemo(
    () => dailyIntake(state.meals, week.weekStart, DAYS_IN_WEEK),
    [state.meals, week.weekStart],
  );

  const logged = days.filter((d) => d.weight !== null);
  const thisWeek = deltas.find((d) => d.weekStart === week.weekStart);
  const target = profile.macroTargets?.kcal ?? 0;
  const eaten = intake.filter((d) => d.logged);
  const avgKcal = eaten.length ? Math.round(eaten.reduce((n, d) => n + d.kcal, 0) / eaten.length) : 0;
  const onTarget = target > 0 ? eaten.filter((d) => Math.abs(d.kcal - target) <= 150).length : 0;

  const [input, setInput] = useState("");
  const loggedToday = state.weighIns.some((w) => w.date === today);

  function logWeighIn() {
    const v = parseFloat(input);
    if (!isNaN(v) && v > 0) {
      dispatch({ type: "LOG_WEIGHIN", date: today, weight: v });
      // No toast and no re-fetch: everything on this screen is derived from `state.weighIns`, so the day
      // cell, the average and the delta bar have already moved by the time this returns.
      setInput("");
    }
  }

  return (
    <div>
      <div className="sh">Weight &amp; food</div>
      <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        <div className="row" style={{ alignItems: "flex-end", gap: 16 }}>
          <div>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {thisWeek ? thisWeek.average : "—"}
            </div>
            <div className="scr">{profile.units} · week average</div>
          </div>
          {thisWeek?.change != null && (
            <div style={{ paddingBottom: 2 }}>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-neutral-400)" }}>
                {thisWeek.change > 0 ? "+" : ""}{thisWeek.change}
              </div>
              <div className="mu">on last week</div>
            </div>
          )}
        </div>

        {/* Seven days, blanks included. */}
        <div style={{ display: "flex", gap: 4, marginTop: 13 }}>
          {days.map((d) => (
            <div
              key={d.date}
              style={{
                flex: 1, minWidth: 0, textAlign: "center", borderRadius: 8, padding: "7px 0 6px",
                background: d.weight !== null ? "var(--color-accent-900)" : "transparent",
                border: d.weight !== null ? "1px solid transparent" : "1px dashed var(--color-neutral-900)",
              }}
            >
              <div style={{ fontSize: 9.5, color: "var(--color-neutral-600)" }}>{d.letter}</div>
              <div className="num" style={{ fontSize: 11.5, fontWeight: 700, marginTop: 2, color: d.weight !== null ? "var(--color-text)" : "var(--color-neutral-800)" }}>
                {d.weight ?? "—"}
              </div>
            </div>
          ))}
        </div>
        <div className="mu" style={{ marginTop: 6 }}>
          {logged.length} of 7 logged{logged.length > 0 ? " — the average is built from those" : ""}.
        </div>

        {week.isCurrent && !loggedToday && (
          <div className="row" style={{ gap: 7, marginTop: 10 }}>
            <input
              className="input num"
              style={{ flex: 1, minWidth: 0, height: 38 }}
              type="number"
              inputMode="decimal"
              placeholder={`Today's weight (${profile.units})`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logWeighIn()}
              aria-label="Today's weight"
            />
            <button className="btn btn-solid" style={{ flex: "none", height: 38, fontSize: 12.5 }} onClick={logWeighIn}>
              Log
            </button>
          </div>
        )}

        <div style={{ height: 1, background: "var(--color-neutral-900)", margin: "13px 0 12px" }} />

        {/* The change in the average IS the number the calorie rule reads, so it is drawn rather than left
            to be inferred from a line of absolute weights. */}
        <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Week over week</div>
          <span className="mu">change in average</span>
        </div>
        <WeekDeltaChart deltas={deltas} selected={week.weekStart} units={profile.units} />

        <div style={{ height: 1, background: "var(--color-neutral-900)", margin: "13px 0 12px" }} />

        <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Calories</div>
          <span className="mu">daily{target > 0 ? `, against ${target.toLocaleString()}` : ""}</span>
          <div style={{ flex: 1 }} />
          <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{avgKcal ? avgKcal.toLocaleString() : "—"}</span>
          <span className="mu">avg</span>
        </div>
        <IntakeBars intake={intake} target={target} />
        <div className="mu" style={{ marginTop: 8, lineHeight: 1.5 }}>
          {eaten.length === 0
            ? "No food logged this week."
            : <><span style={{ color: "var(--color-text)", fontWeight: 500 }}>{onTarget} of {eaten.length} days on target.</span>{eaten.length < DAYS_IN_WEEK ? ` ${DAYS_IN_WEEK - eaten.length} not logged.` : ""}</>}
        </div>

        <button
          onClick={() => nav("/nutrition")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--color-accent)", padding: "11px 0 0", textAlign: "left" }}
        >
          Open Nutrition →
        </button>
      </div>
    </div>
  );
}

/** Bars above and below a zero line, with the week being viewed picked out. */
function WeekDeltaChart({ deltas, selected, units }: { deltas: ReturnType<typeof weeklyDeltas>; selected: string; units: string }) {
  const withChange = deltas.filter((d) => d.change !== null);
  if (withChange.length === 0) {
    return <div className="mu">Two weeks of weigh-ins and this fills in — one week has nothing to compare to.</div>;
  }
  const biggest = Math.max(...withChange.map((d) => Math.abs(d.change!)), 0);
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6, height: 76 }}>
      {withChange.map((d) => {
        const { height: size, direction } = deltaBar(d.change!, biggest);
        const up = direction === "up";
        const on = d.weekStart === selected;
        return (
          <div key={d.weekStart} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="num" style={{ fontSize: 10, color: on ? "var(--color-accent-300)" : "var(--color-neutral-500)", height: 14 }}>
              {d.change! > 0 ? "+" : ""}{d.change}
            </div>
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ height: 30, display: "flex", alignItems: "flex-end" }}>
                {up && <div style={{ width: "100%", height: size, borderRadius: "3px 3px 0 0", background: on ? "var(--color-accent)" : "var(--color-accent-900)" }} />}
              </div>
              <div style={{ height: 1, background: "var(--color-neutral-800)" }} />
              <div style={{ height: 30 }}>
                {!up && <div style={{ width: "100%", height: size, borderRadius: "0 0 3px 3px", background: on ? "var(--color-accent)" : "var(--color-accent-900)" }} />}
              </div>
            </div>
            <div className="mu" style={{ fontSize: 9.5, marginTop: 2 }}>{units}</div>
          </div>
        );
      })}
    </div>
  );
}

function IntakeBars({ intake, target }: { intake: ReturnType<typeof dailyIntake>; target: number }) {
  const ceiling = intakeCeiling(intake.map((d) => d.kcal), target);
  return (
    <div style={{ position: "relative", height: INTAKE_BOX_HEIGHT }}>
      {target > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: INTAKE_BOX_HEIGHT - (target / ceiling) * INTAKE_BOX_HEIGHT, borderTop: "1px dashed var(--color-neutral-700)" }} />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 4 }}>
        {intake.map((d) => {
          const near = target > 0 && Math.abs(d.kcal - target) <= 150;
          return (
            <div
              key={d.date}
              title={d.logged ? `${d.kcal} kcal` : "not logged"}
              style={{
                flex: 1, minWidth: 0, borderRadius: "3px 3px 0 0",
                height: intakeBarHeight(d.kcal, d.logged, ceiling, INTAKE_BOX_HEIGHT),
                background: !d.logged
                  ? "var(--color-neutral-900)"
                  : near
                    ? "var(--color-accent)"
                    : "var(--color-neutral-700)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Choosing which lifts sit on the tab, and how many.
 *
 * Tapping a lift pins it; the order is the order picked. Clearing the list hands it back to the app, which
 * is why "Let the app choose" is a button rather than a checkbox nobody would find. */
function MainLiftsSheet({ onClose, onSave }: { onClose: () => void; onSave: (lifts: string[] | undefined, count: number | undefined) => void }) {
  const { state } = useStore();
  const profile = useEffectiveProfile();
  const all = useMemo(
    () => liftSummaries(state.program).sort((a, b) => b.topLoad - a.topLoad || a.name.localeCompare(b.name)),
    [state.program],
  );
  const [picked, setPicked] = useState<string[]>(profile.mainLifts ?? []);
  const [count, setCount] = useState(profile.mainLiftCount ?? DEFAULT_MAIN_LIFT_COUNT);

  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={{ height: "80%", maxHeight: "80%", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ alignItems: "flex-start", flex: "none" }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Progress</div>
            <div style={{ fontSize: 17, fontFamily: "var(--font-heading)" }}>Main lifts</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", padding: 4 }}>
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="mu" style={{ margin: "8px 0 10px", lineHeight: 1.55, flex: "none" }}>
          {picked.length > 0
            ? `Showing the ${picked.length} you picked, in this order.`
            : `The app is picking ${count} — one per movement pattern, heaviest first. Tap any below to choose your own instead.`}
        </div>

        {picked.length === 0 && (
          <div className="row" style={{ gap: 7, marginBottom: 10, flex: "none" }}>
            <span className="mu" style={{ flex: 1 }}>How many</span>
            {[3, 4, 5, 6].map((n) => (
              <button
                key={n}
                className={`pill-opt${count === n ? " on" : ""}`}
                style={{ height: 32, paddingInline: 13, fontSize: 12.5 }}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {all.length === 0 && <InfoBanner icon="ph-barbell">No compound lifts logged yet.</InfoBanner>}
          {all.map((l) => {
            const at = picked.indexOf(l.name);
            return (
              <button
                key={l.name}
                className="cell row"
                style={{ width: "100%", textAlign: "left", cursor: "pointer", gap: 10, alignItems: "center" }}
                onClick={() => toggle(l.name)}
                aria-pressed={at >= 0}
              >
                <span
                  style={{
                    width: 22, height: 22, flex: "none", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    background: at >= 0 ? "var(--color-accent)" : "var(--color-neutral-900)",
                    color: at >= 0 ? "var(--color-surface)" : "var(--color-neutral-600)",
                  }}
                >
                  {at >= 0 ? at + 1 : ""}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="trunc" style={{ display: "block", fontSize: 13 }}>{l.name}</span>
                  <span className="mu" style={{ fontSize: 11 }}>
                    top {l.topLoad} {profile.units} · {l.sessions} session{l.sessions === 1 ? "" : "s"}
                    {l.pattern ? ` · ${l.pattern}` : ""}
                  </span>
                </span>
                <span style={{ flex: "none", color: muscleColorVar("Quads"), fontSize: 0 }} />
              </button>
            );
          })}
        </div>

        <div className="row" style={{ gap: 7, marginTop: 11, flex: "none" }}>
          {picked.length > 0 && (
            <button className="btn btn-secondary" style={{ flex: 1, height: 42, fontSize: 12.5 }} onClick={() => setPicked([])}>
              Let the app choose
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ flex: 1, height: 42 }}
            onClick={() => onSave(picked.length > 0 ? picked : undefined, picked.length > 0 ? undefined : count)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
