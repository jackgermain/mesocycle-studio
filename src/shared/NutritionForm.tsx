import React, { useState } from "react";
import { Seg } from "../components/UI";
import { defaultPortionTargets } from "../data/mockData";
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
  const [calcBw, setCalcBw] = useState(200);
  const [calcBf, setCalcBf] = useState(20);
  const [ratePct, setRatePct] = useState(-0.5);
  const [maintenance, setMaintenance] = useState(profile.macroTargets.kcal);

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

  // 1 lb of tissue ≈ 3,500 kcal — a steady daily deficit/surplus compounds to that lb/week change.
  const lbPerWeek = Math.round(calcBw * (ratePct / 100) * 10) / 10;
  const dailyKcalDelta = Math.round((lbPerWeek * 3500) / 7);
  const targetKcal = Math.max(0, maintenance + dailyKcalDelta);

  function applyRate() {
    setKcal(targetKcal);
    setRate(`${ratePct > 0 ? "+" : ""}${ratePct.toFixed(1)}% BW / wk (${lbPerWeek > 0 ? "+" : ""}${lbPerWeek} lb/wk)`);
  }

  function toggleDay(i: number) {
    setDays((d) => d.map((v, idx) => (idx === i ? !v : v)));
  }

  function updatePortion(category: PortionCategory, patch: Partial<PortionTarget>) {
    setPortions((list) => list.map((t) => (t.category === category ? { ...t, ...patch } : t)));
  }

  function save() {
    onSave({
      weighInsPerWeek: cadence === "off" ? 0 : cadence === "3x" ? 3 : 5,
      weighInDays: DAY_KEYS.filter((_, i) => days[i]),
      nutritionMode: mode,
      macroTargets: { kcal, protein, carbs, fat, trainingDayCarbBonus: carbBonus },
      portionTargets: portions,
      rateTargetLabel: rate,
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
                  fontSize: 11.5,
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

          <div className="cell" style={{ padding: 11, marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <i className="ph ph-calculator" style={{ fontSize: 15, color: "var(--color-accent-300)", marginRight: 6 }} />
              <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Protein-first calculator</span>
            </div>
            <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
              Protein is set from lean body mass — around 1 g per lb LBM — not total bodyweight, so a higher body-fat person isn't over-prescribed. Fat and carbs fill in around it. Optional — you can still hand-edit anything below.
            </div>
            <div className="row" style={{ gap: 7 }}>
              <NumField label="Bodyweight (lb)" value={calcBw} onChange={setCalcBw} step={5} />
              <NumField label="Body fat %" value={calcBf} onChange={setCalcBf} step={1} />
            </div>
            <div className="row" style={{ marginTop: 9, fontSize: 12 }}>
              <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Lean mass ≈ {lbm} lb</span>
              <span>
                Suggested protein <b style={{ color: "var(--color-accent-300)", fontFamily: "var(--font-heading)" }}>{suggestedProtein} g</b>
              </span>
            </div>
            <button className="btn btn-block" style={{ marginTop: 9, height: 34, fontSize: 12 }} onClick={applySuggestion}>
              Apply to targets below
            </button>
          </div>

          <div className="cell" style={{ padding: 11, marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <i className="ph ph-scales" style={{ fontSize: 15, color: "var(--color-accent-300)", marginRight: 6 }} />
              <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Rate-of-change calculator</span>
            </div>
            <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
              1 lb of tissue ≈ 3,500 kcal, so a steady daily surplus or deficit compounds into a weekly weight change. Set the rate as a % of bodyweight instead of guessing an absolute calorie number — negative loses, positive gains.
            </div>
            <div className="row" style={{ gap: 7 }}>
              <NumField label="Bodyweight (lb)" value={calcBw} onChange={setCalcBw} step={5} />
              <PctField label="% BW / week" value={ratePct} onChange={setRatePct} step={0.1} />
              <NumField label="Maintenance kcal" value={maintenance} onChange={setMaintenance} step={50} />
            </div>
            <div className="row" style={{ marginTop: 9, fontSize: 12 }}>
              <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>
                ≈ {lbPerWeek > 0 ? "+" : ""}{lbPerWeek} lb/wk
              </span>
              <span>
                {dailyKcalDelta >= 0 ? "+" : ""}
                {dailyKcalDelta} kcal/day → <b style={{ color: "var(--color-accent-300)", fontFamily: "var(--font-heading)" }}>{targetKcal} kcal</b>
              </span>
            </div>
            <button className="btn btn-block" style={{ marginTop: 9, height: 34, fontSize: 12 }} onClick={applyRate}>
              Apply — sets kcal target and rate label below
            </button>
          </div>

          <div className="row" style={{ gap: 7 }}>
            <NumField label="kcal" value={kcal} onChange={setKcal} step={50} />
            <NumField label="Protein" value={protein} onChange={setProtein} step={5} />
            <NumField label="Carbs" value={carbs} onChange={setCarbs} step={10} />
            <NumField label="Fat" value={fat} onChange={setFat} step={5} />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <div className="cell" style={{ flex: 1, padding: 9 }}>
              <div className="scr">Training day</div>
              <div className="row" style={{ marginTop: 3, gap: 6 }}>
                <button onClick={() => setCarbBonus((v) => Math.max(0, v - 10))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
                <span style={{ fontSize: 12.5, color: "var(--color-accent-300)" }}>+{carbBonus} g carbs</span>
                <button onClick={() => setCarbBonus((v) => v + 10)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
            </div>
            <div className="cell" style={{ flex: 1, padding: 9 }}>
              <div className="scr">Rate target</div>
              <input className="input" style={{ marginTop: 3, height: 28, fontSize: 12.5 }} value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {mode === "portions" && (
        <div>
          <div className="sh">Portion targets · per meal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {portions.map((t) => (
              <div key={t.category} className="cell" style={{ padding: 11 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontFamily: "var(--font-heading)" }}>{t.category}</span>
                  <span style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{fmtQty(t)}</span>
                </div>
                <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
                  {UNIT_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      onClick={() => updatePortion(t.category, { unit: u.value, qty: u.value === "plate" ? 0.25 : 1 })}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 7,
                        fontSize: 11.5,
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
                            fontSize: 11.5,
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
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, minWidth: 30, textAlign: "center" }}>{t.qty}</span>
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
        <button className="btn btn-primary btn-block" style={{ height: 46 }} onClick={save}>
          Save {subjectFirstName ? "protocol" : "nutrition settings"}
        </button>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="cell" style={{ flex: 1, padding: 9 }}>
      <div className="scr">{label}</div>
      <div className="row" style={{ marginTop: 3, gap: 4 }}>
        <button onClick={() => onChange(Math.max(0, value - step))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
          <i className="ph ph-minus" style={{ fontSize: 11 }} />
        </button>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, flex: 1, textAlign: "center" }}>{value}</span>
        <button onClick={() => onChange(value + step)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
          <i className="ph ph-plus" style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}

/** Signed, decimal-friendly counterpart to NumField — for a rate that can go negative (losing) or positive (gaining), clamped to a sane weekly range. */
function PctField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  const clamp = (v: number) => Math.round(Math.min(3, Math.max(-3, v)) * 10) / 10;
  return (
    <div className="cell" style={{ flex: 1, padding: 9 }}>
      <div className="scr">{label}</div>
      <div className="row" style={{ marginTop: 3, gap: 4 }}>
        <button onClick={() => onChange(clamp(value - step))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
          <i className="ph ph-minus" style={{ fontSize: 11 }} />
        </button>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, flex: 1, textAlign: "center" }}>
          {value > 0 ? "+" : ""}
          {value.toFixed(1)}%
        </span>
        <button onClick={() => onChange(clamp(value + step))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
          <i className="ph ph-plus" style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}
