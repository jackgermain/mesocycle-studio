import React, { useState } from "react";
import { useStore } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { TabBar } from "../components/TabBar";
import { InfoBanner, Meter, HeroHeader } from "../components/UI";
import FoodSearchSheet from "./FoodSearchSheet";
import type { FoodItem } from "../data/foodDatabase";
import type { PortionCategory } from "../data/types";

const PORTION_ICON: Record<PortionCategory, string> = {
  Protein: "ph-hand-palm",
  Carbs: "ph-hand-deposit",
  Vegetables: "ph-hand-fist",
  Fat: "ph-hand-pointing",
};

/** Rough hand-portion estimates, for people who'd rather eyeball a meal than search a food database. Always optional. */
const QUICK_PORTIONS: { label: string; icon: string; kcal: number; protein: number; carbs: number; fat: number }[] = [
  { label: "Palm of protein", icon: "ph-hand-palm", kcal: 120, protein: 25, carbs: 0, fat: 3 },
  { label: "Cupped hand of carbs", icon: "ph-hand-deposit", kcal: 130, protein: 0, carbs: 30, fat: 0 },
  { label: "Fist of veg", icon: "ph-hand-fist", kcal: 30, protein: 2, carbs: 6, fat: 0 },
  { label: "Thumb of fat", icon: "ph-hand-pointing", kcal: 90, protein: 0, carbs: 0, fat: 10 },
];

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

  if (profile.nutritionMode === "off") {
    return (
      <div className="screen">
        <HeroHeader kicker="Nutrition" title="Not turned on" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-fork-knife">
            {state.program.coachName} hasn't turned on food tracking for you yet. Ask them if you'd like to log meals and get targets.
          </InfoBanner>
        </div>
        <TabBar />
      </div>
    );
  }

  if (profile.nutritionMode === "portions") {
    return <PortionsNutrition />;
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

  function addPortionEstimate(mealId: string, portion: (typeof QUICK_PORTIONS)[number]) {
    dispatch({
      type: "ADD_FOOD_ITEM",
      mealId,
      item: {
        id: `li-${Date.now()}`,
        foodId: `portion-${portion.label}`,
        name: portion.label,
        servingLabel: "hand estimate",
        servings: 1,
        kcal: portion.kcal,
        protein: portion.protein,
        carbs: portion.carbs,
        fat: portion.fat,
      },
    });
  }

  function addMeal() {
    const existingNames = new Set(state.meals.map((m) => m.name));
    const candidates = ["Dinner", "Snack 2", "Snack 3", "Late snack"];
    const name = candidates.find((c) => !existingNames.has(c)) ?? `Meal ${state.meals.length + 1}`;
    dispatch({ type: "ADD_MEAL", name });
  }

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hasTrainingToday = state.program.weeks.some((w) => w.days.some((d) => d.status === "today"));

  return (
    <div className="screen">
      <HeroHeader
        kicker={`${todayLabel} · ${hasTrainingToday ? "training day" : "rest day"}`}
        title="Nutrition"
        right={
          <button onClick={addMeal} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal">
            <i className="ph ph-plus-circle" style={{ fontSize: 24, color: "var(--color-accent)" }} />
          </button>
        }
      />
      <div className="screen-scroll">
        <div className="cell elev-sm">
          <div className="row" style={{ alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="scr">Calories left</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 28, lineHeight: 1.1, marginTop: 3 }}>{left}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mu">{totals.kcal.toLocaleString()} of {kcalTarget.toLocaleString()}</div>
              <div className="mu" style={{ marginTop: 2 }}>{state.program.coachName}'s target</div>
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
                <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
                  {QUICK_PORTIONS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => addPortionEstimate(meal.id, p)}
                      title={`${p.label} · ~${p.kcal} kcal · ${p.protein}p ${p.carbs}c ${p.fat}f`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        cursor: "pointer",
                        border: "1px solid var(--color-divider)",
                        background: "transparent",
                        color: "var(--color-neutral-400)",
                      }}
                    >
                      <i className={`ph ${p.icon}`} style={{ fontSize: 13 }} />
                      {p.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
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

function PortionsNutrition() {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const targets = profile.portionTargets;

  function addMeal() {
    const existingNames = new Set(state.meals.map((m) => m.name));
    const candidates = ["Dinner", "Snack 2", "Snack 3", "Late snack"];
    const name = candidates.find((c) => !existingNames.has(c)) ?? `Meal ${state.meals.length + 1}`;
    dispatch({ type: "ADD_MEAL", name });
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
          <button onClick={addMeal} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal">
            <i className="ph ph-plus-circle" style={{ fontSize: 24, color: "var(--color-accent)" }} />
          </button>
        }
      />
      <div className="screen-scroll">
        <InfoBanner icon="ph-hand-palm">
          No calorie counting — just hit your portions each meal. {state.program.coachName} set these targets for you.
        </InfoBanner>

        <div className="cell elev-sm">
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
