import React, { useEffect, useState } from "react";
import { Seg, Stepper, TickButton } from "../components/UI";
import { defaultPortionTargets } from "../data/mockData";
import { buildPlan, estimateMaintenance, cutCapPct } from "./nutritionPlan";
import type { ClientProfile, NutritionMode, PortionCategory, PortionTarget, PortionUnit } from "../data/types";

type Cadence = "off" | "3x" | "5x";
const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const UNIT_OPTIONS: { value: PortionUnit; label: string; icon: string }[] = [
  { value: "palm", label: "Palm", icon: "ph-hand-palm" },
  { value: "fist", label: "Fist", icon: "ph-hand-fist" },
  { value: "cupped hand", label: "Cupped hand", icon: "ph-hand-deposit" },
  { value: "thumb", label: "Thumb", icon: "ph-hand-pointing" },
  { value: "plate", label: "Plate", icon: "ph-circle" },
];
const PLATE_FRACTIONS = [0.25, 0.33, 0.5, 1];

function fmtQty(t: PortionTarget) {
  if (t.unit === "plate") {
    const map: Record<number, string> = { 0.25: "1/4", 0.33: "1/3", 0.5: "1/2", 1: "whole" };
    return `${map[t.qty] ?? t.qty} plate`;
  }
  return `${t.qty} ${t.unit}${t.qty === 1 ? "" : "s"}`;
}

export interface NutritionProtocolPatch {
  weighInsPerWeek: 0 | 3 | 5;
  weighInDays: string[];
  nutritionMode: NutritionMode;
  macroTargets: ClientProfile["macroTargets"];
  portionTargets: PortionTarget[];
  rateTargetLabel: string;
  bodyFatPct: number;
  maintenanceKcal: number;
  rateTargetPct: number;
  autoNutrition: boolean;
}

/** The full nutrition-targets form -- used both when a coach sets a real client's protocol
 * (NutritionProtocol.tsx) and when someone sets their own (a coach's "Train as myself", or any
 * self-directed account). `subjectFirstName` picks which: pass a name for the coach-editing-someone-else
 * phrasing ("How should Jordan track food?"), omit it for the self-serve phrasing ("How should you track
 * food?"). Layout/logic is identical either way -- only a handful of strings change. */
export function NutritionForm({ profile, subjectFirstName, onSave }: { profile: ClientProfile; subjectFirstName?: string; onSave: (protocol: NutritionProtocolPatch) => void }) {
  const who = subjectFirstName ?? "you";
  const whoCaps = subjectFirstName ?? "You";
  const whoPossessive = subjectFirstName ? `${subjectFirstName}'s` : "your";
  const whoVerb = subjectFirstName ? "checks" : "check";
  const whoCant = subjectFirstName ? `${subjectFirstName} can't` : "you can't";

  const [mode, setMode] = useState<NutritionMode>(profile.nutritionMode);
  const [cadence, setCadence] = useState<Cadence>(profile.weighInsPerWeek === 0 ? "off" : profile.weighInsPerWeek === 3 ? "3x" : "5x");
  const [days, setDays] = useState<boolean[]>(() => DAY_KEYS.map((k) => profile.weighInDays.includes(k)));
  const [kcal, setKcal] = useState(profile.macroTargets.kcal);
  const [protein, setProtein] = useState(profile.macroTargets.protein);
  const [carbs, setCarbs] = useState(profile.macroTargets.carbs);
  const [fat, setFat] = useState(profile.macroTargets.fat);
  const [carbBonus, setCarbBonus] = useState(profile.macroTargets.trainingDayCarbBonus);
  const [rate, setRate] = useState(profile.rateTargetLabel);
  const [portions, setPortions] = useState<PortionTarget[]>(profile.portionTargets.length ? profile.portionTargets : defaultPortionTargets);
  // Seeded from the profile rather than from hardcoded numbers: the calculator was starting every person at
  // 200 lb regardless of what they actually weigh, so its first answer was wrong for everyone.
  const [calcBw, setCalcBw] = useState(profile.bodyweight || 200);
  const [calcBf, setCalcBf] = useState(profile.bodyFatPct ?? 20);
  const [ratePct, setRatePct] = useState(profile.rateTargetPct ?? -0.5);
  const [auto, setAuto] = useState(profile.autoNutrition ?? false);
  const [maintenance, setMaintenance] = useState(
    profile.maintenanceKcal ?? estimateMaintenance({ bodyweightLb: profile.bodyweight || 200, bodyFatPct: profile.bodyFatPct ?? 20 }).kcal,
  );

  const lbm = Math.round(calcBw * (1 - calcBf / 100));
  const suggestedProtein = lbm;

  function applySuggestion() {
    const p = suggestedProtein;
    const fatG = Math.round((kcal * 0.25) / 9);
    const remaining = Math.max(0, kcal - p * 4 - fatG * 9);
    const carbsG = Math.round(remaining / 4);
    setProtein(p);
    setFat(fatG);
    setCarbs(carbsG);
  }

  // N1/N2/N3 all live in shared/nutritionPlan.ts so the cap is enforced in one tested place rather than
  // re-derived in the form. Names kept as they were so the JSX below reads unchanged.
  const plan = buildPlan({
    bodyweightLb: calcBw,
    bodyFatPct: calcBf > 0 ? calcBf : undefined,
    ratePctPerWeek: ratePct,
    maintenanceKcal: maintenance,
  });
  const lbPerWeek = plan.lbPerWeek;
  const dailyKcalDelta = plan.dailyDelta;
  const targetKcal = plan.targetKcal;
  const estimated = estimateMaintenance({ bodyweightLb: calcBw, bodyFatPct: calcBf > 0 ? calcBf : undefined });
  const capPct = cutCapPct(calcBf > 0 ? calcBf : undefined);

  function applyRate() {
    setKcal(targetKcal);
    setRate(plan.label);
    // N3 binds on the request, not just on the advice: if they asked for more than the cap allows, the
    // stored target comes back to the cap too, rather than leaving the form showing one thing and the
    // saved number meaning another.
    if (plan.rate.capped) setRatePct(plan.rate.pct);
  }

  function applyMaintenance() {
    setMaintenance(estimated.kcal);
  }

  function toggleDay(i: number) {
    setDays((d) => d.map((v, idx) => (idx === i ? !v : v)));
  }

  function updatePortion(category: PortionCategory, patch: Partial<PortionTarget>) {
    setPortions((list) => list.map((t) => (t.category === category ? { ...t, ...patch } : t)));
  }

  function save() {
    const derived = auto && mode === "macros";
    onSave({
      weighInsPerWeek: cadence === "off" ? 0 : cadence === "3x" ? 3 : 5,
      weighInDays: DAY_KEYS.filter((_, i) => days[i]),
      nutritionMode: mode,
      // With auto programming on, the numbers ARE the plan: derived from maintenance and the capped rate
      // rather than whatever the hand-edit fields were last left on. Off, nothing is computed behind their
      // back and the typed values stand.
      macroTargets: derived
        ? { kcal: plan.targetKcal, protein: plan.macros.protein, carbs: plan.macros.carbs, fat: plan.macros.fat, trainingDayCarbBonus: carbBonus }
        : { kcal, protein, carbs, fat, trainingDayCarbBonus: carbBonus },
      portionTargets: portions,
      rateTargetLabel: derived ? plan.label : rate,
      bodyFatPct: calcBf,
      maintenanceKcal: maintenance,
      // Never store a rate the doctrine forbids, whatever the stepper was left on.
      rateTargetPct: plan.rate.pct,
      autoNutrition: auto,
    });
  }

  return (
    <div className="screen-scroll">
      <div>
        <div className="sh">How should {who} track food?</div>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: "off", label: "Off" },
            { value: "macros", label: "Macros" },
            { value: "portions", label: "Portions" },
          ]}
        />
        <div className="mu" style={{ marginTop: 7 }}>
          {mode === "off" && `No food tracking — ${whoPossessive} Nutrition tab stays weigh-ins only.`}
          {mode === "macros" && "Full calorie and gram targets with meal logging — for whoever wants the precision."}
          {mode === "portions" && "Hand and plate portions, no numbers to log — for whoever does better with a simpler system."}
        </div>
      </div>

      <div>
        <div className="sh">Auto nutrition programming</div>
        <CheckRow
          checked={auto}
          onChange={setAuto}
          label="Work the numbers out automatically"
          hint={
            mode === "macros"
              ? `Calories and macros come from maintenance and a rate instead of being typed in, the rate is held inside the ${capPct}%-a-week cap, and maintenance keeps getting corrected from ${whoPossessive} weigh-in trend.`
              : "Only drives calorie and macro targets — switch tracking to Macros above for it to do anything."
          }
        />
      </div>

      <div>
        <div className="sh">Weigh-in cadence</div>
        <Seg
          value={cadence}
          onChange={setCadence}
          options={[
            { value: "off", label: "Off" },
            { value: "3x", label: "3× / week" },
            { value: "5x", label: "5× / week" },
          ]}
        />
        <div className="mu" style={{ marginTop: 7 }}>Required, not optional — {whoCant} close the day without it. Feeds the weight chart on Progress.</div>
      </div>

      {cadence !== "off" && (
        <div>
          <div className="sh">Days</div>
          <div style={{ display: "flex", gap: 5 }}>
            {DAY_LABELS.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 7,
                  border: `1px solid ${days[i] ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: days[i] ? "var(--color-accent-900)" : "transparent",
                  color: days[i] ? "var(--color-accent-200)" : "var(--color-neutral-500)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "macros" && (
        <div>
          <div className="sh">Macro targets</div>

          <div className="cell" style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <i className="ph ph-calculator" style={{ fontSize: 14, color: "var(--color-accent-300)", marginRight: 6 }} />
              <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Protein-first calculator</span>
            </div>
            <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
              Protein is set from lean body mass — around 1 g per lb LBM — not total bodyweight, so a higher body-fat person isn't over-prescribed. Fat and carbs fill in around it. Optional — you can still hand-edit anything below.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <CalcRow label="Bodyweight" unit="lb" value={calcBw} onChange={setCalcBw} step={5} />
              <CalcRow label="Body fat" unit="%" value={calcBf} onChange={setCalcBf} step={1} max={100} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 9, fontSize: 12.5 }}>
              <div className="row">
                <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Lean mass</span>
                <span className="num" style={{ fontWeight: 700,  }}>{lbm} lb</span>
              </div>
              <div className="row">
                <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Suggested protein</span>
                <span className="num" style={{ fontWeight: 700, color: "var(--color-accent-300)" }}>{suggestedProtein} g</span>
              </div>
            </div>
            <button className="btn btn-block" style={{ marginTop: 9, height: 44, fontSize: 12.5 }} onClick={applySuggestion}>
              Apply to targets below
            </button>
          </div>

          {/* N1: every target is an offset from maintenance, so maintenance is the first number. */}
          <div className="cell" style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <i className="ph ph-flame" style={{ fontSize: 14, color: "var(--color-accent-300)", marginRight: 6 }} />
              <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Maintenance calculator</span>
            </div>
            <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
              What {who} burn{subjectFirstName ? "s" : ""} in a day, holding weight. Everything below is an offset from it, so a wrong number here makes every target wrong the same way. Worked out from lean mass, which needs no age or sex.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <CalcRow label="Bodyweight" unit="lb" value={calcBw} onChange={setCalcBw} step={5} />
              <CalcRow label="Body fat" unit="%" value={calcBf} onChange={setCalcBf} step={1} max={75} />
              <CalcRow label="Maintenance" unit="kcal" value={maintenance} onChange={setMaintenance} step={50} />
            </div>
            <div className="row" style={{ marginTop: 9, fontSize: 12.5 }}>
              <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Estimate</span>
              <span className="num" style={{ fontWeight: 700, color: "var(--color-accent-300)" }}>{estimated.kcal} kcal</span>
            </div>
            <div className="mu" style={{ marginTop: 4, lineHeight: 1.5 }}>{estimated.how}. It is a starting point — once there are a few weeks of weigh-ins, the scale corrects it.</div>
            <button className="btn btn-block" style={{ marginTop: 9, height: 44, fontSize: 12.5 }} onClick={applyMaintenance}>
              Use the estimate
            </button>
          </div>

          {/* N2 the arithmetic, N3/N5 the cap. Both come from shared/nutritionPlan.ts. */}
          <div className="cell" style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <i className="ph ph-scales" style={{ fontSize: 14, color: "var(--color-accent-300)", marginRight: 6 }} />
              <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Rate of change</span>
            </div>
            <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
              1 lb of tissue is 3,500 kcal, so 500 a day under maintenance is a pound a week off and 500 over is a pound on. Set it as a % of bodyweight — half a percent is a very different number of calories at 140 lb than at 250 lb.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <CalcRow label="Rate" unit="% BW / wk" value={ratePct} onChange={setRatePct} step={0.1} min={-2} max={2} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 9, fontSize: 12.5 }}>
              <div className="row">
                <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Weekly change</span>
                <span className="num" style={{ fontWeight: 700 }}>{lbPerWeek > 0 ? "+" : ""}{lbPerWeek} lb/wk</span>
              </div>
              <div className="row">
                <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Daily intake</span>
                <span className="num" style={{ fontWeight: 700 }}>
                  {dailyKcalDelta >= 0 ? "+" : ""}{dailyKcalDelta} → <b style={{ color: "var(--color-accent-300)" }}>{targetKcal} kcal</b>
                </span>
              </div>
              <div className="row">
                <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Fastest cut allowed</span>
                <span className="num" style={{ fontWeight: 700 }}>{capPct}% / wk</span>
              </div>
            </div>
            {plan.cappedNote && (
              <div className="mu" style={{ marginTop: 8, lineHeight: 1.5, color: "var(--color-accent-200)" }}>
                <i className="ph ph-shield-check" style={{ fontSize: 13, marginRight: 5 }} />
                {plan.cappedNote}
              </div>
            )}
            <div className="mu" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Losing faster than the cap does not get {who} there sooner — past that rate, more of what comes off is muscle.
              {calcBf >= 30 && " Body fat is high enough here that the cap is raised."}
            </div>
            <button className="btn btn-block" style={{ marginTop: 9, height: 44, fontSize: 12.5 }} onClick={applyRate}>
              Apply — sets kcal target and rate label below
            </button>
          </div>

          <div className="cell">
            <CalcRow label="Calories" unit="kcal" value={kcal} onChange={setKcal} step={50} />
            <CalcRow label="Protein" unit="g" value={protein} onChange={setProtein} step={5} />
            <CalcRow label="Carbs" unit="g" value={carbs} onChange={setCarbs} step={10} />
            <CalcRow label="Fat" unit="g" value={fat} onChange={setFat} step={5} />
          </div>
          <div className="cell" style={{ marginTop: 8 }}>
            <CalcRow label="Training day bonus" unit="g carbs" value={carbBonus} onChange={setCarbBonus} step={10} />
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5 }}>Rate target</span>
              <input
                className="input"
                style={{ width: 150, flex: "none", height: 30, fontSize: 12.5, textAlign: "center" }}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {mode === "portions" && (
        <div>
          <div className="sh">Portion targets · per meal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {portions.map((t) => (
              <div key={t.category} className="cell">
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>{t.category}</span>
                  <span style={{ fontSize: 12.5, color: "var(--color-accent-300)" }}>{fmtQty(t)}</span>
                </div>
                <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
                  {UNIT_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      onClick={() => updatePortion(t.category, { unit: u.value, qty: u.value === "plate" ? 0.25 : 1 })}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 7,
                        fontSize: 11,
                        cursor: "pointer",
                        border: `1px solid ${t.unit === u.value ? "var(--color-accent)" : "var(--color-divider)"}`,
                        background: t.unit === u.value ? "var(--color-accent-900)" : "transparent",
                        color: t.unit === u.value ? "var(--color-accent-200)" : "var(--color-neutral-400)",
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
                <div className="row" style={{ gap: 6, marginTop: 8, justifyContent: "center" }}>
                  {t.unit === "plate"
                    ? PLATE_FRACTIONS.map((f) => (
                        <button
                          key={f}
                          onClick={() => updatePortion(t.category, { qty: f })}
                          style={{
                            flex: 1,
                            height: 32,
                            borderRadius: 7,
                            fontSize: 11,
                            cursor: "pointer",
                            border: `1px solid ${t.qty === f ? "var(--color-accent)" : "var(--color-divider)"}`,
                            background: t.qty === f ? "var(--color-accent-900)" : "transparent",
                            color: t.qty === f ? "var(--color-accent-200)" : "var(--color-neutral-400)",
                          }}
                        >
                          {{ 0.25: "1/4", 0.33: "1/3", 0.5: "1/2", 1: "Whole" }[f]}
                        </button>
                      ))
                    : (
                      <>
                        <button onClick={() => updatePortion(t.category, { qty: Math.max(0.5, t.qty - 0.5) })} style={{ background: "none", border: "1px solid var(--color-divider)", borderRadius: 7, width: 32, height: 32, color: "var(--color-neutral-400)", cursor: "pointer" }}>
                          <i className="ph ph-minus" style={{ fontSize: 12 }} />
                        </button>
                        <span className="num" style={{ fontWeight: 700, fontSize: 14, minWidth: 30, textAlign: "center" }}>{t.qty}</span>
                        <button onClick={() => updatePortion(t.category, { qty: t.qty + 0.5 })} style={{ background: "none", border: "1px solid var(--color-divider)", borderRadius: 7, width: 32, height: 32, color: "var(--color-neutral-400)", cursor: "pointer" }}>
                          <i className="ph ph-plus" style={{ fontSize: 12 }} />
                        </button>
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
          <div className="mu" style={{ marginTop: 8, lineHeight: 1.5 }}>
            E.g. Protein = 1 palm, Carbs = 1/3 plate. {whoCaps} just {whoVerb} off each one per meal — no numbers.
          </div>
        </div>
      )}

      <div className="mu" style={{ lineHeight: 1.55 }}>
        {subjectFirstName
          ? `Set once per client and it drives ${whoPossessive} Nutrition tab, the missed-weigh-in flag on the Desk, and the trend line on Body.`
          : "Set this once and it drives your Nutrition tab, the missed-weigh-in flag, and the trend line on Progress."}
      </div>

      <div style={{ marginTop: "auto", paddingBottom: 8 }}>
        <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={save}>
          Save {subjectFirstName ? "protocol" : "nutrition settings"}
        </button>
      </div>
    </div>
  );
}

/** Every numeric field here is editable both ways: the +/- buttons for a quick nudge, or tap the number
 * and type an exact value -- +/- alone was fine as a touch-only control, but this app needs to work with a
 * keyboard too. Keeps its own draft text while focused so a mid-edit "" or partial number isn't fought back
 * to the last committed value; commits on blur/Enter. */
/** One calculator input: label on the left, stepper on the right, one per line. These used to sit side by
 * side as equal-width cards, which fell apart as soon as a label wrapped -- "Maintenance kcal" went to two
 * lines and dropped its number below the others, so the numbers no longer lined up with each other or with
 * their labels. Stacked rows can't misalign no matter how long a label gets. */
function CalcRow({
  label,
  unit,
  value,
  onChange,
  step,
  min = 0,
  max,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="row" style={{ minHeight: 34 }}>
      <span style={{ flex: 1, fontSize: 12.5 }}>
        {label}
        {unit ? <span style={{ color: "var(--color-neutral-500)", marginLeft: 4 }}>({unit})</span> : null}
      </span>
      <Stepper value={value} onChange={onChange} step={step} min={min} max={max} width={54} fontSize={14} />
    </div>
  );
}

/** The app's checkbox is a 22px ticked square, the same shape as ticking off a set or a logged food —
 * reused here rather than introducing a switch, so it reads as the same act. */
function CheckRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="cell row"
      style={{ width: "100%", textAlign: "left", cursor: "pointer", alignItems: "flex-start", gap: 10, border: `1px solid ${checked ? "var(--color-accent)" : "var(--color-divider)"}`, background: checked ? "var(--color-accent-900)" : undefined }}
    >
      <TickButton checked={checked} size={22} style={{ marginTop: 1 }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 12.5, color: checked ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}>{label}</span>
        <span className="mu" style={{ display: "block", marginTop: 3, lineHeight: 1.5 }}>{hint}</span>
      </span>
    </button>
  );
}

function PctField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  const clamp = (v: number) => Math.round(Math.min(3, Math.max(-3, v)) * 10) / 10;
  const [text, setText] = useState(value.toFixed(1));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value.toFixed(1));
  }, [value, focused]);

  function commit() {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onChange(clamp(n));
    else setText(value.toFixed(1));
  }

  return (
    <div className="cell" style={{ flex: 1 }}>
      <div className="scr">{label}</div>
      <div className="row" style={{ marginTop: 3, gap: 4, justifyContent: "center" }}>
        <button onClick={() => onChange(clamp(value - step))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0, flex: "none" }}>
          <i className="ph ph-minus" style={{ fontSize: 12 }} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          step={0.1}
          value={text}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
              e.currentTarget.blur();
            }
          }}
          style={{ width: 50, flex: "none", textAlign: "center", background: "none", border: "none", outline: "none", fontFamily: "var(--font-heading)", fontSize: 14, color: "inherit", padding: 0 }}
        />
        <button onClick={() => onChange(clamp(value + step))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0, flex: "none" }}>
          <i className="ph ph-plus" style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );
}
