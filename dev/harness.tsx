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
import ProgressTab from "../src/screens/ProgressTab";
import { ProgramGate } from "../src/coach/screens/ClientProgram";
import { MemoryRouter } from "react-router-dom";

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

/** The Progress tab, seeded with a block and a fortnight of weigh-ins and meals.
 *
 * The tab is all charts, and a chart is the one thing reading the code cannot check: an SVG that computes
 * the right numbers and draws them off the viewBox looks identical in a diff and wrong on a phone. */
function ProgressHarness() {
  const { state, dispatch, ready } = useStore();
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!ready || seeded.current) return;
    seeded.current = true;

    const LIFTS: [string, number, number][] = [
      ["Barbell Back Squat", 300, 5],
      ["Barbell Deadlift", 385, 3],
      ["Barbell Bench Press", 215, 6],
      ["Lat Pulldown — Wide Grip", 170, 10],
      ["Barbell Bent-Over Row", 175, 10],
      ["Cable Lateral Raise", 25, 15],
    ];
    const day = (w: number, d: number, date: string, done: boolean) => ({
      id: `w${w}d${d}`, code: `D${d}`, label: `Day ${d}`, dow: "Mon", date,
      status: done ? "done" : "visible", muscleSummary: "", setCount: LIFTS.length,
      order: LIFTS.map((_, i) => `w${w}d${d}e${i}`),
      feedbackDone: done,
      exercises: Object.fromEntries(LIFTS.map(([name, base, reps], i) => {
        const load = base + (w - 1) * 10;
        return [`w${w}d${d}e${i}`, {
          id: `w${w}d${d}e${i}`, name, muscle: "Quads", metaLine: "", hasVideo: false,
          sets: [1, 2, 3].map((n) => ({
            id: `w${w}d${d}e${i}s${n}`, index: n, type: "straight", checked: done,
            actual: done ? { reps, load } : null,
            prescribed: { reps, load, effort: { scale: "RIR", value: 2 }, restSec: 120 },
          })),
        }];
      })),
    });

    dispatch({
      type: "SET_PROGRAM",
      program: {
        name: "Hypertrophy", totalWeeks: 4, coachName: "Coach",
        weeks: [
          { number: 1, phase: "accumulation", days: [day(1, 1, "2026-09-14", true), day(1, 2, "2026-09-16", true), day(1, 3, "2026-09-18", true)] },
          { number: 2, phase: "accumulation", days: [day(2, 1, "2026-09-21", true), day(2, 2, "2026-09-23", true), day(2, 3, "2026-09-25", false)] },
          { number: 3, phase: "accumulation", days: [day(3, 1, "2026-09-28", true), day(3, 2, "2026-09-30", false), day(3, 3, "2026-10-02", false)] },
          { number: 4, phase: "deload", days: [day(4, 1, "2026-10-05", false), day(4, 2, "2026-10-07", false), day(4, 3, "2026-10-09", false)] },
        ],
      } as never,
    });

    for (const [date, weight] of [
      ["2026-09-14", 202.8], ["2026-09-16", 203.2], ["2026-09-18", 202.9],
      ["2026-09-21", 203.4], ["2026-09-23", 203.0], ["2026-09-25", 203.2],
      ["2026-09-28", 203.2], ["2026-09-30", 203.6],
    ] as [string, number][]) dispatch({ type: "LOG_WEIGHIN", date, weight });

    dispatch({ type: "UPDATE_PROFILE", profile: { bodyweight: 203, units: "lb", macroTargets: { kcal: 3200, protein: 190, carbs: 360, fat: 95, trainingDayCarbBonus: 0 } } });
  }, [ready, dispatch]);

  React.useEffect(() => {
    // Meals need the program in place first, and ADD_MEAL dates them.
    if (!seeded.current || state.meals.length > 0) return;
    const kcals = [3180, 3240, 3090, 3210, 2600, 3260, 3150, 3190];
    [
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-28", "2026-09-29", "2026-09-30",
    ].forEach((date, i) => {
      dispatch({ type: "ADD_MEAL", name: `Day ${i + 1}`, date });
    });
    setTimeout(() => {
      const meals = JSON.parse(JSON.stringify(stateRef.current.meals));
      meals.forEach((m: { id: string; date?: string }, i: number) => {
        dispatch({
          type: "ADD_FOOD_ITEM", mealId: m.id,
          item: { id: `f${i}`, name: "Day's food", kcal: kcals[i] ?? 3200, protein: 190, carbs: 360, fat: 95, loggedAt: m.date, eaten: true } as never,
        });
      });
    }, 0);
  }, [state.meals.length, dispatch]);

  const stateRef = React.useRef(state);
  stateRef.current = state;

  return <ProgressTab />;
}

/** Drives the coach's program editor with no sign-in and no coach store.
 *
 * Mounts `ProgramGate` — everything below the client lookup — against a seeded block, so the part that can
 * only be checked by looking at it gets looked at: the week strip, the lock badges, and whether a stepper
 * renders at all for each of the four load modes. Reading the code cannot tell me that an RPE set shows an
 * RPE stepper rather than nothing.
 *
 * The block is shaped to hit every branch on purpose: finished days, a missed day in the past, today's
 * session with its first set already ticked, weeks still ahead, a superset pair, an exercise prescribed in
 * RPE, a set with a null load inside a pounds exercise, and an AMRAP set whose reps are the string "6+". */
function ProgramEditorHarness() {
  const { dispatch, ready } = useStore();
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!ready || seeded.current) return;
    seeded.current = true;

    const set = (id: string, index: number, over: Record<string, unknown> = {}) => ({
      id, index, type: "straight", checked: false, actual: null,
      prescribed: { reps: 8, load: 185, effort: { scale: "RIR", value: 2 }, restSec: 120 },
      ...over,
    });

    const day = (id: string, d: number, date: string, status: string, over: Record<string, unknown> = {}) => ({
      id, code: `D${d}`, label: ["Push", "Pull", "Legs"][d - 1] ?? "Day", dow: "Mon", date, status,
      muscleSummary: "Chest · Back", setCount: 9,
      order: [`${id}e1`, `${id}e2`, `${id}e3`, `${id}e4`],
      exercises: {
        [`${id}e1`]: {
          id: `${id}e1`, name: "Barbell Bench Press", muscle: "Chest", metaLine: "", hasVideo: false,
          loadMode: "lb",
          sets: [
            set(`${id}e1s1`, 1, { prescribed: { reps: 6, load: 225, effort: { scale: "RIR", value: 2 }, restSec: 180 }, checked: status === "today" }),
            set(`${id}e1s2`, 2, { prescribed: { reps: 6, load: 225, effort: { scale: "RIR", value: 1 }, restSec: 180 } }),
            // An AMRAP set: reps is a string no stepper can represent.
            set(`${id}e1s3`, 3, { type: "amrap", prescribed: { reps: "6+", load: 215, effort: { scale: "RIR", value: 0 }, restSec: 180 } }),
          ],
        },
        // A superset pair -- contiguous in `order`, which is what groupsOf requires.
        [`${id}e2`]: {
          id: `${id}e2`, name: "Incline Dumbbell Press", muscle: "Chest", metaLine: "", hasVideo: false,
          loadMode: "lb", supersetId: "sup-a",
          sets: [set(`${id}e2s1`, 1, { prescribed: { reps: 10, load: 70, effort: { scale: "RIR", value: 2 }, restSec: 0 } })],
        },
        [`${id}e3`]: {
          id: `${id}e3`, name: "Cable Fly", muscle: "Chest", metaLine: "", hasVideo: false,
          loadMode: "lb", supersetId: "sup-a",
          sets: [
            set(`${id}e3s1`, 1, { prescribed: { reps: 12, load: 30, effort: { scale: "RIR", value: 1 }, restSec: 90 } }),
            // Null load inside a pounds exercise -- the "Bodyweight · add load" branch.
            set(`${id}e3s2`, 2, { prescribed: { reps: 12, load: null, effort: { scale: "RIR", value: 1 }, restSec: 90 } }),
          ],
        },
        // Prescribed by effort, not weight: load null and an RPE scale, which is how loadModeOf reads
        // "this block is in RPE". The editor has to show an RPE stepper here, not an empty cell.
        [`${id}e4`]: {
          id: `${id}e4`, name: "Weighted Pull Up", muscle: "Back", metaLine: "", hasVideo: false,
          loadMode: "rpe",
          sets: [
            set(`${id}e4s1`, 1, { prescribed: { reps: 8, load: null, effort: { scale: "RPE", value: 8 }, restSec: 150 } }),
            set(`${id}e4s2`, 2, { prescribed: { reps: 8, load: null, effort: { scale: "RPE", value: 8.5 }, restSec: 150 } }),
          ],
        },
      },
      ...over,
    });

    dispatch({
      type: "SET_PROGRAM",
      program: {
        name: "Upper / Lower", totalWeeks: 3, coachName: "Coach",
        weeks: [
          { number: 1, phase: "accumulation", days: [
            day("w1d1", 1, "2026-09-28", "done", { feedbackDone: true }),
            day("w1d2", 2, "2026-09-30", "done", { feedbackDone: true }),
            day("w1d3", 3, "2026-10-02", "done", { feedbackDone: true }),
          ] },
          { number: 2, phase: "accumulation", days: [
            day("w2d1", 1, "2026-10-05", "done", { feedbackDone: true }),
            // Missed: in the past but never finished, so it must read PAST rather than LOGGED.
            day("w2d2", 2, "2026-10-07", "visible"),
            // Today, with its first bench set already ticked.
            day("w2d3", 3, "2026-10-09", "today"),
          ] },
          { number: 3, phase: "deload", days: [
            day("w3d1", 1, "2026-10-12", "visible"),
            day("w3d2", 2, "2026-10-14", "visible"),
            day("w3d3", 3, "2026-10-16", "visible"),
          ] },
        ],
      } as never,
    });
    dispatch({ type: "UPDATE_PROFILE", profile: { bodyweight: 203, units: "lb" } });
  }, [ready, dispatch]);

  return <ProgramGate clientName="Sam Okafor" onBack={() => {}} />;
}

const params = new URLSearchParams(location.search);
const mode = params.has("food")
  ? <FoodHarness />
  : params.has("progress")
    ? <MemoryRouter initialEntries={["/progress"]}><ProgressHarness /></MemoryRouter>
    : params.has("program")
      ? <MemoryRouter initialEntries={["/coach/clients/x/program"]}><ProgramEditorHarness /></MemoryRouter>
      : <Harness />;
createRoot(document.getElementById("root")!).render(
  <StoreProvider accountId={NIL_ACCOUNT} ownerName="Harness" coachName="Coach">
    {mode}
  </StoreProvider>,
);
