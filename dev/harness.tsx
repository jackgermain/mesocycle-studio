/** Drives the REAL nutrition settings form with no sign-in.
 *
 * Every screen in the client app sits behind a Supabase session, and there is no dev bypass -- so for a
 * long time the only way to check that "change a number, press save, the Nutrition tab updates" actually
 * worked was to reason about the code and ask Jack to try it on his phone. Three rounds of that on
 * 2026-09-15 were three rounds too many. Jack: "get this right and don't make me have to go over this
 * shit with you again."
 *
 * This page mounts the real NutritionForm inside the real StoreProvider, feeds it the same derived profile
 * the Nutrition screen does, and routes its save through the same SET_NUTRITION_PROTOCOL dispatch. The
 * readout at the top is exactly what the Nutrition card would display. Open it in the browser pane, seed
 * a profile, edit a field, press the real Save button, and read the result -- the whole path, in a real
 * browser, with real event ordering.
 *
 * StoreProvider still talks to Supabase: with no session, RLS returns no row (so the store hydrates blank)
 * and every upsert is refused (a console error, nothing written). The account id below is deliberately
 * the nil UUID so nothing real can ever be matched.
 *
 * Lives in dev/, outside tsconfig's include: ["src"] and outside the production build, which only builds
 * index.html. Served by the dev server at /dev/harness.html. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { StoreProvider, useStore } from "../src/state/store";
import { NutritionForm } from "../src/shared/NutritionForm";
import { deriveNutritionTargets } from "../src/shared/derivedTargets";
import FoodSearchSheet from "../src/screens/FoodSearchSheet";

const NIL_ACCOUNT = "00000000-0000-0000-0000-000000000000";

function Harness() {
  const { state, dispatch, ready } = useStore();
  const [seeded, setSeeded] = useState(false);
  const [saves, setSaves] = useState(0);

  if (!ready) return <div style={{ padding: 16 }}>hydrating…</div>;

  if (!seeded) {
    return (
      <div style={{ padding: 16 }}>
        <button
          id="seed"
          className="btn btn-primary"
          onClick={() => {
            // A profile shaped like the one in Jack's screenshots: auto on, a stale seeded maintenance,
            // and targets frozen from it.
            dispatch({
              type: "UPDATE_PROFILE",
              profile: {
                bodyweight: 203,
                nutritionMode: "macros",
                autoNutrition: true,
                rateTargetPct: 0,
                rateTargetLabel: "Maintenance",
                bodyFatPct: 20,
                activityLevel: "very",
                ageYears: 30,
                heightCm: 185,
                maintenanceKcal: 2700,
                macroTargets: { kcal: 2699, protein: 203, carbs: 312, fat: 71, trainingDayCarbBonus: 0 },
              },
            });
            setSeeded(true);
          }}
        >
          Seed a JAX-shaped profile
        </button>
      </div>
    );
  }

  // Exactly what Nutrition.tsx hands the form and shows on the card.
  const derived = deriveNutritionTargets(state.profile);
  const readout = {
    saves,
    autoNutrition: derived.autoNutrition,
    bodyweight: derived.bodyweight,
    maintenanceKcal: derived.maintenanceKcal,
    maintenanceKcalManual: derived.maintenanceKcalManual ?? false,
    cardTarget: derived.macroTargets.kcal + derived.macroTargets.trainingDayCarbBonus * 4,
    macros: derived.macroTargets,
  };

  return (
    <div style={{ padding: 16, maxWidth: 480 }}>
      <pre
        id="readout"
        data-saves={saves}
        style={{ background: "var(--color-surface-raised)", padding: 10, borderRadius: 8, fontSize: 12, overflowX: "auto" }}
      >
        {JSON.stringify(readout, null, 2)}
      </pre>
      {/* Keyed on the save count so the form REMOUNTS after each save, the way it does in the app: the
          Nutrition screen unmounts it on save and mounts a fresh one when you reopen "Change macros". A
          form that stayed mounted would keep showing its own state and hide a failure to persist. */}
      {/* A bounded height, so .screen-scroll overflows the way it does on a phone. The form is far taller
          than this, which is what lets a sticky Save button engage -- and the failure being tested only
          shows up when the button can move under a tap. */}
      <div className="screen" style={{ position: "relative", height: 560 }}>
        <NutritionForm
          key={saves}
          profile={derived}
          onSave={(protocol) => {
            dispatch({ type: "SET_NUTRITION_PROTOCOL", protocol });
            setSaves((n) => n + 1);
          }}
        />
      </div>
    </div>
  );
}

/** `?food` — the food search sheet on its own, inside a phone-sized fixed frame like `.app-root`.
 *
 * Built to check one property: the search bar's top edge does not move when the results change height.
 * On an iPhone the sheet is anchored behind the keyboard, so any movement of its top pushes the search bar
 * out of sight mid-word. Desktop Chrome has no on-screen keyboard, but the sheet's geometry is the same, so
 * measuring the input's top before and after typing tests the actual cause. */
function FoodHarness() {
  return (
    <div id="frame" style={{ position: "fixed", inset: 0, background: "var(--color-bg)" }}>
      <FoodSearchSheet mealName="Meal 2" onAdd={() => {}} onClose={() => {}} />
    </div>
  );
}

const mode = new URLSearchParams(location.search).has("food") ? <FoodHarness /> : <Harness />;
createRoot(document.getElementById("root")!).render(
  <StoreProvider accountId={NIL_ACCOUNT} ownerName="Harness" coachName="Coach">
    {mode}
  </StoreProvider>,
);
