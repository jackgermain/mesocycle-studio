import React, { useState } from "react";
import { foodDatabase, scaleFood, type FoodItem } from "../data/foodDatabase";

export default function FoodSearchSheet({ mealName, onAdd, onClose }: { mealName: string; onAdd: (food: FoodItem, servings: number) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  const results = foodDatabase.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()) || f.brand?.toLowerCase().includes(query.toLowerCase()));

  if (selected) {
    const scaled = scaleFood(selected, servings);
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="row">
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", display: "flex" }}>
              <i className="ph ph-caret-left" style={{ fontSize: 18 }} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontFamily: "var(--font-heading)" }}>{selected.name}</div>
              {selected.brand && <div className="mu">{selected.brand}</div>}
            </div>
          </div>

          <div className="cell" style={{ padding: 12 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="scr" style={{ flex: 1 }}>Servings ({selected.servingLabel})</span>
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 16 }}>
              <button onClick={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))} style={{ background: "none", border: "1px solid var(--color-divider)", borderRadius: 8, width: 36, height: 36, color: "var(--color-neutral-300)", cursor: "pointer" }}>
                <i className="ph ph-minus" style={{ fontSize: 14 }} />
              </button>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 20, minWidth: 40, textAlign: "center" }}>{servings}</span>
              <button onClick={() => setServings((s) => +(s + 0.5).toFixed(1))} style={{ background: "none", border: "1px solid var(--color-divider)", borderRadius: 8, width: 36, height: 36, color: "var(--color-neutral-300)", cursor: "pointer" }}>
                <i className="ph ph-plus" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>

          <div className="cell" style={{ padding: 12 }}>
            <div className="scr" style={{ marginBottom: 8 }}>Adds to {mealName}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{scaled.kcal} kcal</div>
            <div className="row" style={{ gap: 14, marginTop: 8, fontSize: 12.5, color: "var(--color-neutral-400)" }}>
              <span>{scaled.protein}g protein</span>
              <span>{scaled.carbs}g carbs</span>
              <span>{scaled.fat}g fat</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ height: 46 }}
            onClick={() => {
              onAdd(selected, servings);
              onClose();
            }}
          >
            Add to {mealName}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80%" }}>
        <div className="row">
          <div style={{ flex: 1, fontSize: 15, fontFamily: "var(--font-heading)" }}>Add food to {mealName}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", display: "flex" }}>
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="input row" style={{ height: 40, gap: 8, color: "var(--color-neutral-600)" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, e.g. chicken breast"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }}
          />
        </div>
        <div className="mu" style={{ lineHeight: 1.5 }}>
          Searches this app's local food list — a real build would connect a database like MyFitnessPal/Nutritionix or barcode and label scanning here.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, overflowY: "auto" }}>
          {results.map((f) => (
            <button key={f.id} className="link-row" style={{ padding: "10px 11px" }} onClick={() => setSelected(f)}>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div className="trunc" style={{ fontSize: 13.5 }}>{f.name}</div>
                <div className="mu" style={{ marginTop: 1 }}>
                  {f.brand ? `${f.brand} · ` : ""}
                  {f.servingLabel} · {f.kcal} kcal
                </div>
              </div>
              <i className="ph ph-plus-circle" style={{ fontSize: 18, color: "var(--color-accent)", flex: "none" }} />
            </button>
          ))}
          {results.length === 0 && <div className="mu" style={{ textAlign: "center", padding: 20 }}>No foods match &ldquo;{query}&rdquo;.</div>}
        </div>
      </div>
    </div>
  );
}
