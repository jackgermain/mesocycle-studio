import React, { useState } from "react";
import { useStore } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { useAuth } from "../lib/auth";
import { TabBar } from "../components/TabBar";
import { InfoBanner, Meter, HeroHeader, BackHeader } from "../components/UI";
import { NutritionForm } from "../shared/NutritionForm";
import FoodSearchSheet from "./FoodSearchSheet";
import type { FoodItem } from "../data/foodDatabase";
import type { PortionCategory } from "../data/types";

const PORTION_ICON: Record<PortionCategory, string> = {
  Protein: "ph-hand-palm",
  Carbs: "ph-hand-deposit",
  Vegetables: "ph-hand-fist",
  Fat: "ph-hand-pointing",
};

const WEEK = [
  { d: "M", on: true },
  { d: "T", on: true },
  { d: "W", on: true },
  { d: "T", on: false },
  { d: "F", on: true },
  { d: "S", on: true },
  { d: "S", on: null },
];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function totalsFor(items: { kcal: number; protein: number; carbs: number; fat: number }[]) {
  const raw = items.reduce((acc, i) => ({ kcal: acc.kcal + i.kcal, p: acc.p + i.protein, c: acc.c + i.carbs, f: acc.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { kcal: Math.round(raw.kcal), p: round1(raw.p), c: round1(raw.c), f: round1(raw.f) };
}

export default function Nutrition() {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const target = profile.macroTargets;
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNutritionOptions, setShowNutritionOptions] = useState(false);
  const { account, previewingAsClient } = useAuth();
  const [settingUp, setSettingUp] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  // A coach training themselves, or a self-directed friend/family account, has no external coach setting
  // their nutrition for them — let them set (and later change) their own targets instead of just telling
  // them to "ask their coach" (which would be themselves, for the train-yourself case).
  const canSelfServe = (account?.role === "coach" && previewingAsClient) || account?.role === "friend";

  if (settingUp || editingTargets) {
    return (
      <div className="screen">
        <BackHeader kicker="Nutrition" title={editingTargets ? "Edit targets" : "Set up tracking"} onBack={() => { setSettingUp(false); setEditingTargets(false); }} />
        <NutritionForm
          profile={profile}
          onSave={(protocol) => {
            dispatch({ type: "SET_NUTRITION_PROTOCOL", protocol });
            if (protocol.nutritionMode !== "off" && state.meals.length === 0) {
              for (const name of ["Meal 1", "Meal 2", "Meal 3"]) dispatch({ type: "ADD_MEAL", name });
            }
            dispatch({ type: "SHOW_TOAST", message: editingTargets ? "Nutrition targets updated." : "Nutrition tracking is on." });
            setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
            setSettingUp(false);
            setEditingTargets(false);
          }}
        />
      </div>
    );
  }

  if (profile.nutritionMode === "off") {
    return (
      <div className="screen">
        <HeroHeader kicker="Nutrition" title="Not turned on" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-fork-knife">
            {canSelfServe
              ? "Nothing set up yet — since you're self-directed, you can set your own tracking style and targets."
              : `${state.program.coachName} hasn't turned on food tracking for you yet. Ask them if you'd like to log meals and get targets.`}
          </InfoBanner>
          {canSelfServe && (
            <button className="btn btn-primary btn-block" style={{ height: 46 }} onClick={() => setSettingUp(true)}>
              Set up nutrition tracking
            </button>
          )}
        </div>
        <TabBar />
      </div>
    );
  }

  if (profile.nutritionMode === "portions") {
    return <PortionsNutrition canSelfServe={canSelfServe} onEditTargets={() => setEditingTargets(true)} />;
  }

  const totals = totalsFor(state.meals.flatMap((m) => m.items));
  const kcalTarget = target.kcal + target.trainingDayCarbBonus * 4;
  const left = Math.max(0, kcalTarget - totals.kcal);

  function addFoodTo(mealId: string, food: FoodItem, servings: number) {
    const scaled = { kcal: Math.round(food.kcal * servings), protein: Math.round(food.protein * servings * 10) / 10, carbs: Math.round(food.carbs * servings * 10) / 10, fat: Math.round(food.fat * servings * 10) / 10 };
    dispatch({
      type: "ADD_FOOD_ITEM",
      mealId,
      item: { id: `li-${Date.now()}`, foodId: food.id, name: food.name, servingLabel: food.servingLabel, servings, ...scaled },
    });
  }

  function addSection(kind: "Meal" | "Snack") {
    const count = state.meals.filter((m) => m.name.startsWith(kind)).length;
    dispatch({ type: "ADD_MEAL", name: `${kind} ${count + 1}` });
    setShowAddMenu(false);
  }

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hasTrainingToday = state.program.weeks.some((w) => w.days.some((d) => d.status === "today"));

  return (
    <div className="screen">
      <HeroHeader
        kicker={`${todayLabel} · ${hasTrainingToday ? "training day" : "rest day"}`}
        title="Nutrition"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAddMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal or snack">
              <i className="ph ph-plus-circle" style={{ fontSize: 24, color: "var(--color-accent)" }} />
            </button>
            {showAddMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 32, right: 0, zIndex: 10, width: 150, background: "var(--color-surface-raised)", border: "1px solid var(--color-divider)", borderRadius: 8, boxShadow: "var(--shadow-md)", overflow: "hidden" }}
              >
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Meal")}>
                  <i className="ph ph-fork-knife" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a meal</span>
                </button>
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Snack")}>
                  <i className="ph ph-cookie" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a snack</span>
                </button>
              </div>
            )}
          </div>
        }
      />
      <div className="screen-scroll" onClick={() => showAddMenu && setShowAddMenu(false)}>
        <div className="cell elev-sm" style={{ position: "relative" }}>
          {canSelfServe && (
            <button
              onClick={() => setShowNutritionOptions(true)}
              aria-label="Nutrition options"
              style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
            >
              <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
            </button>
          )}
          <div className="row" style={{ alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="scr">Calories left</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 28, lineHeight: 1.1, marginTop: 3 }}>{left}</div>
            </div>
            <div style={{ textAlign: "right", paddingRight: canSelfServe ? 20 : 0 }}>
              <div className="mu">{totals.kcal.toLocaleString()} of {kcalTarget.toLocaleString()}</div>
              <div className="mu" style={{ marginTop: 2 }}>{canSelfServe ? "Your target" : `${state.program.coachName}'s target`}</div>
            </div>
          </div>
          <Meter pct={(totals.kcal / kcalTarget) * 100} large />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <MacroCol label="Protein" value={totals.p} target={target.protein} color="var(--color-accent)" valueColor="var(--color-accent-300)" />
            <MacroCol label="Carbs" value={totals.c} target={target.carbs + target.trainingDayCarbBonus} color="var(--color-neutral-500)" />
            <MacroCol label="Fat" value={totals.f} target={target.fat} color="var(--color-neutral-500)" />
          </div>
        </div>

        {state.meals.map((meal) => {
          const mealTotals = totalsFor(meal.items);
          return (
            <div key={meal.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <div className="sh" style={{ flex: 1, margin: 0 }}>{meal.name}</div>
                {meal.items.length > 0 && <span className="mu">{mealTotals.kcal} kcal</span>}
                <button
                  onClick={() => dispatch({ type: "REMOVE_MEAL", mealId: meal.id })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex", padding: 2, marginLeft: 6 }}
                  aria-label={`Remove ${meal.name}`}
                >
                  <i className="ph ph-x" style={{ fontSize: 12 }} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {meal.items.map((item) => (
                  <div key={item.id} className="cell row" style={{ padding: "10px 12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="trunc" style={{ fontSize: 13.5 }}>{item.name}</div>
                      <div className="mu trunc" style={{ marginTop: 2 }}>
                        {item.servings}× {item.servingLabel} · {item.protein}p · {item.carbs}c · {item.fat}f
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 13, fontFamily: "var(--font-heading)" }}>{item.kcal}</div>
                      <button
                        onClick={() => dispatch({ type: "REMOVE_FOOD_ITEM", mealId: meal.id, itemId: item.id })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex" }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <i className="ph ph-x" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setAddingTo(meal.id)}
                  style={{ border: "1px dashed var(--color-neutral-700)", borderRadius: "var(--radius-md)", padding: 11, textAlign: "center", fontSize: 12.5, color: "var(--color-accent)", background: "none", cursor: "pointer" }}
                >
                  + Add food to {meal.name.toLowerCase()}
                </button>
              </div>
            </div>
          );
        })}

        <div>
          <div className="sh">Week · {WEEK.filter((w) => w.on).length} of 7 days on target</div>
          <div className="cell">
            <div style={{ display: "flex", gap: 5 }}>
              {WEEK.map((w, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: 26,
                      borderRadius: 6,
                      background: w.on === true ? "var(--color-accent-800)" : w.on === false ? "var(--color-neutral-700)" : "transparent",
                      border: w.on === null ? "1px solid var(--color-accent)" : undefined,
                    }}
                  />
                  <div className="scr" style={{ marginTop: 4, color: w.on === null ? "var(--color-accent)" : undefined }}>{w.d}</div>
                </div>
              ))}
            </div>
            <div className="mu" style={{ marginTop: 10 }}>Within 100 kcal and 15 g protein counts as on target.</div>
          </div>
        </div>
      </div>
      <TabBar />

      {addingTo && (
        <FoodSearchSheet
          mealName={state.meals.find((m) => m.id === addingTo)?.name ?? "meal"}
          onAdd={(food, servings) => addFoodTo(addingTo, food, servings)}
          onClose={() => setAddingTo(null)}
        />
      )}

      {showNutritionOptions && (
        <div className="sheet-backdrop" onClick={() => setShowNutritionOptions(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Nutrition</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Options</div>
              </div>
              <button onClick={() => setShowNutritionOptions(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 18 }} />
              </button>
            </div>
            <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => { setShowNutritionOptions(false); setEditingTargets(true); }}>
              <i className="ph ph-pencil-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Edit nutrition targets</div>
                <div className="mu" style={{ marginTop: 1 }}>Change how you track and your calorie/macro goals.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtPortionQty(unit: string, qty: number) {
  if (unit === "plate") {
    const map: Record<number, string> = { 0.25: "1/4", 0.33: "1/3", 0.5: "1/2", 1: "whole" };
    return `${map[qty] ?? qty} plate`;
  }
  return `${qty} ${unit}${qty === 1 ? "" : "s"}`;
}

function PortionsNutrition({ canSelfServe, onEditTargets }: { canSelfServe: boolean; onEditTargets: () => void }) {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const targets = profile.portionTargets;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNutritionOptions, setShowNutritionOptions] = useState(false);

  function addSection(kind: "Meal" | "Snack") {
    const count = state.meals.filter((m) => m.name.startsWith(kind)).length;
    dispatch({ type: "ADD_MEAL", name: `${kind} ${count + 1}` });
    setShowAddMenu(false);
  }

  const totalSlots = state.meals.length * targets.length;
  const hitSlots = state.meals.reduce((sum, m) => sum + (m.portionsHit?.length ?? 0), 0);

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hasTrainingToday = state.program.weeks.some((w) => w.days.some((d) => d.status === "today"));

  return (
    <div className="screen">
      <HeroHeader
        kicker={`${todayLabel} · ${hasTrainingToday ? "training day" : "rest day"}`}
        title="Nutrition"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAddMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal or snack">
              <i className="ph ph-plus-circle" style={{ fontSize: 24, color: "var(--color-accent)" }} />
            </button>
            {showAddMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 32, right: 0, zIndex: 10, width: 150, background: "var(--color-surface-raised)", border: "1px solid var(--color-divider)", borderRadius: 8, boxShadow: "var(--shadow-md)", overflow: "hidden" }}
              >
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Meal")}>
                  <i className="ph ph-fork-knife" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a meal</span>
                </button>
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Snack")}>
                  <i className="ph ph-cookie" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a snack</span>
                </button>
              </div>
            )}
          </div>
        }
      />
      <div className="screen-scroll" onClick={() => showAddMenu && setShowAddMenu(false)}>
        <InfoBanner icon="ph-hand-palm">
          No calorie counting — just hit your portions each meal. {canSelfServe ? "You set these targets." : `${state.program.coachName} set these targets for you.`}
        </InfoBanner>

        <div className="cell elev-sm" style={{ position: "relative" }}>
          {canSelfServe && (
            <button
              onClick={() => setShowNutritionOptions(true)}
              aria-label="Nutrition options"
              style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
            >
              <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
            </button>
          )}
          <div className="row" style={{ alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="scr">Portions today</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1.1, marginTop: 3 }}>
                {hitSlots} <span style={{ fontSize: 14, color: "var(--color-neutral-500)" }}>of {totalSlots || targets.length}</span>
              </div>
            </div>
          </div>
          <Meter pct={totalSlots ? (hitSlots / totalSlots) * 100 : 0} large />
        </div>

        {state.meals.map((meal) => {
          const hit = meal.portionsHit ?? [];
          return (
            <div key={meal.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <div className="sh" style={{ flex: 1, margin: 0 }}>{meal.name}</div>
                <span className="mu">{hit.length} of {targets.length}</span>
                <button
                  onClick={() => dispatch({ type: "REMOVE_MEAL", mealId: meal.id })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex", padding: 2, marginLeft: 6 }}
                  aria-label={`Remove ${meal.name}`}
                >
                  <i className="ph ph-x" style={{ fontSize: 12 }} />
                </button>
              </div>
              <div className="cell" style={{ padding: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {targets.map((t) => {
                    const on = hit.includes(t.category);
                    return (
                      <button
                        key={t.category}
                        onClick={() => dispatch({ type: "TOGGLE_PORTION", mealId: meal.id, category: t.category })}
                        className="row"
                        style={{
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                          background: on ? "var(--color-accent-900)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <i className={`ph ${PORTION_ICON[t.category]}`} style={{ fontSize: 17, color: on ? "var(--color-accent-300)" : "var(--color-neutral-500)", marginRight: 10 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: on ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}>{t.category}</div>
                          <div className="mu" style={{ marginTop: 1 }}>{fmtPortionQty(t.unit, t.qty)}</div>
                        </div>
                        <i className={`ph ${on ? "ph-check-circle" : "ph-circle"}`} style={{ fontSize: 20, color: on ? "var(--color-accent)" : "var(--color-neutral-700)" }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <TabBar />

      {showNutritionOptions && (
        <div className="sheet-backdrop" onClick={() => setShowNutritionOptions(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Nutrition</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Options</div>
              </div>
              <button onClick={() => setShowNutritionOptions(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 18 }} />
              </button>
            </div>
            <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => { setShowNutritionOptions(false); onEditTargets(); }}>
              <i className="ph ph-pencil-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Edit nutrition targets</div>
                <div className="mu" style={{ marginTop: 1 }}>Change how you track and your portion goals.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroCol({ label, value, target, color, valueColor }: { label: string; value: number; target: number; color: string; valueColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="row" style={{ fontSize: 11.5, marginBottom: 5 }}>
        <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-heading)", color: valueColor ?? "var(--color-neutral-200)" }}>{value}</span>
      </div>
      <Meter pct={(value / target) * 100} color={color} />
      <div className="mu" style={{ marginTop: 4, fontSize: 10 }}>of {target} g</div>
    </div>
  );
}
