import type { ClientProfile, MealSection, PortionTarget, Program, TrainingDay, TrainingWeek, WeighIn, WorkExercise, WorkSet } from "./types";
import { snapLoadForEquipment, stepDumbbellWeight } from "../screens/exerciseHelpers";

export const defaultPortionTargets: PortionTarget[] = [
  { category: "Protein", unit: "palm", qty: 1 },
  { category: "Carbs", unit: "cupped hand", qty: 1 },
  { category: "Vegetables", unit: "fist", qty: 1 },
  { category: "Fat", unit: "thumb", qty: 1 },
];

export const clientProfile: ClientProfile = {
  name: "Marcus",
  units: "lb",
  smallestPlate: "2.5 lb",
  heightLabel: "5' 11\"",
  bodyweight: 196,
  effortScale: "RIR",
  weighInsPerWeek: 3,
  weighInDays: ["Mon", "Wed", "Fri"],
  nutritionMode: "macros",
  macroTargets: { kcal: 2500, protein: 200, carbs: 300, fat: 70, trainingDayCarbBonus: 40 },
  portionTargets: defaultPortionTargets,
  rateTargetLabel: "Maintenance",
};

/** A blank starting profile for anyone training themself outside the client roster — no coach is setting their nutrition or weigh-in targets, so those start off and they're free to log ad hoc. */
export function buildSelfProfile(name: string): ClientProfile {
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    units: "lb",
    smallestPlate: "2.5 lb",
    heightLabel: "",
    bodyweight: 180,
    effortScale: "RIR",
    weighInsPerWeek: 0,
    weighInDays: [],
    nutritionMode: "off",
    macroTargets: { kcal: 2500, protein: 180, carbs: 250, fat: 70, trainingDayCarbBonus: 0 },
    portionTargets: defaultPortionTargets,
    rateTargetLabel: "Maintenance",
  };
}

// ---- date helpers -------------------------------------------------------

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function shortDow(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const CURRENT_WEEK_NUMBER = 3;

/** Every session this week is placed relative to today: U1=+0 (today), L1=+1, U2=+3, L2=+5. Other weeks shift by whole weeks from there, so the grid always lines up with the real calendar. */
function dateFor(weekNumber: number, offsetFromU1: number): Date {
  return addDays(TODAY, (weekNumber - CURRENT_WEEK_NUMBER) * 7 + offsetFromU1);
}

const DAY_OFFSETS: Record<"U1" | "L1" | "U2" | "L2", number> = { U1: 0, L1: 1, U2: 3, L2: 5 };

// ---- exercise builders ----------------------------------------------------

let uid = 0;
function nextId(prefix: string) {
  uid += 1;
  return `${prefix}-${uid}`;
}

function straightSet(index: number, reps: number, load: number | null, effortValue: number, restSec: number, logged: boolean): WorkSet {
  return {
    id: nextId("set"),
    index,
    type: "straight",
    prescribed: { reps, load, effort: { scale: "RIR", value: effortValue }, restSec },
    actual: logged ? { reps, load } : null,
    checked: logged,
  };
}

function simpleExercise(id: string, name: string, muscle: string, hasVideo: boolean, sets: number, baseLoad: number | null, reps: number, restSec: number, weekNumber: number, logged: boolean, equipment: import("./types").Equipment): WorkExercise {
  const raw = baseLoad === null ? null : baseLoad + (weekNumber - 1) * 2.5;
  const load = raw === null ? null : snapLoadForEquipment(equipment, raw);
  const arr: WorkSet[] = [];
  for (let i = 1; i <= sets; i++) {
    arr.push(straightSet(i, reps, load, i === sets ? 1 : 2, restSec, logged));
  }
  return {
    id,
    name,
    muscle,
    metaLine: `${sets} sets · ${load === null ? "bodyweight" : `${load} lb`}`,
    hasVideo,
    equipment,
    sets: arr,
  };
}

function benchPress(weekNumber: number, logged: boolean): WorkExercise {
  const load = snapLoadForEquipment("barbell", 85 + (weekNumber - 1) * 2);
  return {
    id: "bench-press",
    name: "Barbell Bench Press",
    muscle: "Chest",
    metaLine: `3 sets · top set ${load + 10} × 6`,
    hasVideo: true,
    equipment: "barbell",
    sets: [
      straightSet(1, 8, load, 3, 150, logged),
      straightSet(2, 8, load + 5, 2, 150, logged),
      straightSet(3, 6, load + 10, 1, 150, logged),
    ],
  };
}

function inclinePress(weekNumber: number, logged: boolean): WorkExercise {
  const load = snapLoadForEquipment("dumbbell", 32.5 + Math.round((weekNumber - 1) / 2) * 2.5);
  const backOff = stepDumbbellWeight(load, -1);
  return {
    id: "incline-db-press",
    name: "Incline Dumbbell Press",
    muscle: "Chest",
    metaLine: `3 sets · ${load} lb`,
    hasVideo: true,
    equipment: "dumbbell",
    sets: [
      straightSet(1, 10, load, 2, 120, logged),
      straightSet(2, 10, load, 1, 120, logged),
      straightSet(3, 10, backOff, 1, 120, logged),
    ],
  };
}

function pullUp(): WorkExercise {
  return {
    id: "pull-up",
    name: "Pull-Up",
    muscle: "Back",
    metaLine: "4 sets · best unassisted 6 reps",
    hasVideo: false,
    equipment: "bodyweight",
    sets: [
      { id: nextId("set"), index: 1, type: "straight", prescribed: { reps: 4, load: null, effort: { scale: "RIR", value: 2 }, restSec: 180, assistance: { type: "none" } }, actual: null, checked: false, lastWeek: "4 reps unassisted" },
      { id: nextId("set"), index: 2, type: "straight", prescribed: { reps: 4, load: null, effort: { scale: "RIR", value: 1 }, restSec: 180, assistance: { type: "part-band", detail: "Thin band", splitUnassisted: 2, splitAssisted: 2 } }, actual: null, checked: false, lastWeek: "1 free + 3 thin banded" },
      { id: nextId("set"), index: 3, type: "straight", prescribed: { reps: 8, load: null, effort: { scale: "RIR", value: 1 }, restSec: 150, assistance: { type: "machine", detail: "-40 lb assisted machine" } }, actual: null, checked: false, lastWeek: "8 reps at -45 lb" },
      { id: nextId("set"), index: 4, type: "cluster", prescribed: { reps: 12, load: null, effort: { scale: "RIR", value: 1 }, restSec: null, assistance: { type: "band", detail: "Mid band" }, cluster: { clusters: 3, repsPerCluster: [4, 4, 4], intraRestSec: 10 } }, actual: null, checked: false, lastWeek: "10 of 12 · shape 4+4+2" },
    ],
  };
}

function tricepPushdown(checkedCount: 0 | 2 | 4): WorkExercise {
  const mk = (i: number, checked: boolean) => ({
    id: nextId("set"),
    index: i,
    type: "straight" as const,
    prescribed: {
      reps: 10,
      load: 50,
      effort: { scale: "RIR" as const, value: 2 },
      restSec: 90,
      tempo: { eccentric: 2, isometric: 2, concentric: 1, holdAt: "bottom" as const },
    },
    actual: checked ? { reps: 10, load: i === 4 ? 45 : 50 } : null,
    checked,
    lastWeek: "4 × 10 at 45 lb · all ticked",
  });
  return {
    id: "tricep-pushdown",
    name: "Tricep Rope Pushdown",
    muscle: "Triceps",
    metaLine: "4 × 10 · RIR 2 · iso 2s at bottom",
    hasVideo: true,
    equipment: "cable",
    sets: [mk(1, checkedCount >= 2), mk(2, checkedCount >= 2), mk(3, checkedCount >= 4), mk(4, checkedCount >= 4)],
  };
}

function cableLateralRaise(): WorkExercise {
  return {
    id: "cable-lateral-raise",
    name: "Cable Lateral Raise",
    muscle: "Side delts",
    metaLine: "3 × 12–15",
    hasVideo: true,
    equipment: "cable",
    sets: [
      straightSet(1, 15, 12.5, 2, 90, false),
      straightSet(2, 13, 12.5, 1, 90, false),
      straightSet(3, 12, 12.5, 1, 90, false),
    ],
  };
}

function hackSquat(weekNumber: number, logged: boolean): WorkExercise {
  const load = snapLoadForEquipment("machine", 90 + (weekNumber - 1) * 2.5);
  return {
    id: "hack-squat",
    name: "Hack Squat",
    muscle: "Quads",
    metaLine: `4 sets · ${load + 20} × 8 top set`,
    hasVideo: true,
    equipment: "machine",
    sets: [
      straightSet(1, 10, load, 3, 150, logged),
      straightSet(2, 8, load + 20, 1, 150, logged),
      straightSet(3, 8, load + 10, 2, 150, logged),
      straightSet(4, 10, load, 2, 150, logged),
    ],
  };
}

// ---- day builders ----------------------------------------------------------

function buildUpperA(weekNumber: number, rich: boolean, checkedCount: 0 | 2 | 4 | "all" | "none"): Record<string, WorkExercise> {
  if (!rich) {
    const logged = checkedCount === "all";
    return { "bench-press": benchPress(weekNumber, logged), "incline-db-press": inclinePress(weekNumber, logged) };
  }
  const tricepChecked = checkedCount === "all" ? 4 : checkedCount === "none" ? 0 : (checkedCount as 0 | 2 | 4);
  const loggedOthers = checkedCount !== "none";
  return {
    "bench-press": benchPress(weekNumber, loggedOthers),
    "incline-db-press": inclinePress(weekNumber, loggedOthers),
    "pull-up": pullUp(),
    "tricep-pushdown": tricepPushdown(tricepChecked),
    "cable-lateral-raise": cableLateralRaise(),
  };
}

function buildLowerA(weekNumber: number, logged: boolean): Record<string, WorkExercise> {
  return { "hack-squat": hackSquat(weekNumber, logged) };
}

function buildUpperB(weekNumber: number, logged: boolean): Record<string, WorkExercise> {
  return {
    "overhead-press": simpleExercise("overhead-press", "Seated Overhead Press", "Side delts", false, 4, 45, 8, 120, weekNumber, logged, "machine"),
    "cable-fly": simpleExercise("cable-fly", "Cable Fly", "Chest", false, 3, 15, 12, 90, weekNumber, logged, "cable"),
  };
}

function buildLowerB(weekNumber: number, logged: boolean): Record<string, WorkExercise> {
  return {
    "rdl": simpleExercise("rdl", "Romanian Deadlift", "Hamstrings", false, 3, 135, 10, 150, weekNumber, logged, "barbell"),
    "leg-curl": simpleExercise("leg-curl", "Seated Leg Curl", "Hamstrings", false, 3, 60, 12, 90, weekNumber, logged, "machine"),
  };
}

function makeDay(weekNumber: number, code: "U1" | "L1" | "U2" | "L2", label: string, muscleSummary: string, exercises: Record<string, WorkExercise>, status: TrainingDay["status"], extra?: Partial<TrainingDay>): TrainingDay {
  const date = dateFor(weekNumber, DAY_OFFSETS[code]);
  const order = Object.keys(exercises);
  const setCount = Object.values(exercises).reduce((n, e) => n + e.sets.length, 0);
  const day: TrainingDay = {
    id: `w${weekNumber}-${code.toLowerCase()}`,
    code,
    label,
    dow: shortDow(date),
    date: isoDate(date),
    status,
    muscleSummary,
    setCount,
    order,
    exercises,
    ...extra,
  };
  return day;
}

function buildWeek(weekNumber: number, phase: TrainingWeek["phase"]): TrainingWeek {
  const isPast = weekNumber < CURRENT_WEEK_NUMBER;
  const isCurrent = weekNumber === CURRENT_WEEK_NUMBER;

  const u1 = isCurrent
    ? makeDay(weekNumber, "U1", "Upper A", "chest, delts, triceps, back", buildUpperA(weekNumber, true, 2), "today")
    : makeDay(weekNumber, "U1", "Upper A", "chest, delts, triceps, back", buildUpperA(weekNumber, false, isPast ? "all" : "none"), isPast ? "done" : "visible", isPast ? { log: sessionLog(true), feedbackDone: true } : undefined);

  const l1 = makeDay(weekNumber, "L1", "Lower A", "quads, hams, calves", buildLowerA(weekNumber, isPast), isPast ? "done" : "visible", isPast ? { log: sessionLog(true), feedbackDone: true } : undefined);
  const u2 = makeDay(weekNumber, "U2", "Upper B", "chest, delts, triceps", buildUpperB(weekNumber, isPast), isPast ? "done" : "visible", isPast ? { log: sessionLog(false), feedbackDone: true } : undefined);
  const l2 = makeDay(weekNumber, "L2", "Lower B", "hams, glutes, calves", buildLowerB(weekNumber, isPast), isPast ? "done" : "visible", isPast ? { log: sessionLog(false), feedbackDone: true } : undefined);

  return { number: weekNumber, phase, days: [u1, l1, u2, l2] };
}

function sessionLog(big: boolean) {
  return { sessionSets: big ? 20 : 12, sessionTotal: big ? 20 : 12, tonnage: big ? "12.1t" : "6.4t", timeMin: big ? 48 : 32, pumpAvg: 4 };
}

export function buildInitialProgram(opts?: { name?: string; coachName?: string }): Program {
  const weeks: TrainingWeek[] = [
    buildWeek(1, "accumulation"),
    buildWeek(2, "accumulation"),
    buildWeek(3, "accumulation"),
    buildWeek(4, "accumulation"),
    buildWeek(5, "intensification"),
    buildWeek(6, "intensification"),
    buildWeek(7, "deload"),
  ];

  return {
    name: opts?.name ?? "Hypertrophy 8",
    totalWeeks: 7,
    coachName: opts?.coachName ?? "Dana",
    weeks,
  };
}

export function buildInitialMeals(): MealSection[] {
  return [
    { id: "meal-breakfast", name: "Breakfast", items: [
      { id: "li-1", foodId: "f6", name: "Rolled Oats, dry", servingLabel: "1/2 cup (40g)", servings: 1.5, kcal: 225, protein: 7.5, carbs: 40.5, fat: 4.5 },
      { id: "li-2", foodId: "f7", name: "Whey Protein Powder", servingLabel: "1 scoop (32g)", servings: 1, kcal: 120, protein: 24, carbs: 3, fat: 1 },
      { id: "li-3", foodId: "f9", name: "Blueberries", servingLabel: "1 cup (148g)", servings: 1, kcal: 84, protein: 1.1, carbs: 21, fat: 0.5 },
    ] },
    { id: "meal-lunch", name: "Lunch", items: [
      { id: "li-4", foodId: "f1", name: "Chicken Breast, grilled", servingLabel: "100 g", servings: 2, kcal: 330, protein: 62, carbs: 0, fat: 7.2 },
      { id: "li-5", foodId: "f2", name: "White Rice, cooked", servingLabel: "1 cup (158g)", servings: 1.5, kcal: 308, protein: 6.5, carbs: 67.5, fat: 0.6 },
      { id: "li-6", foodId: "f17", name: "Broccoli, steamed", servingLabel: "1 cup (156g)", servings: 1, kcal: 55, protein: 3.7, carbs: 11, fat: 0.6 },
    ] },
    { id: "meal-snack", name: "Snack", items: [
      { id: "li-7", foodId: "f10", name: "Greek Yoghurt, nonfat", servingLabel: "170 g", servings: 1.5, kcal: 150, protein: 27, carbs: 9, fat: 0 },
    ] },
    { id: "meal-postworkout", name: "Post-workout", items: [
      { id: "li-8", foodId: "f7", name: "Whey Protein Powder", servingLabel: "1 scoop (32g)", servings: 1, kcal: 120, protein: 24, carbs: 3, fat: 1 },
      { id: "li-9", foodId: "f8", name: "Banana", servingLabel: "1 medium (118g)", servings: 1, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ] },
  ];
}

export function buildInitialWeighIns(): WeighIn[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entries: WeighIn[] = [];
  // Every Mon/Wed/Fri for the last 4 weeks, ending a couple of days before today.
  let w = 196 + 3.6;
  for (let daysAgo = 30; daysAgo >= 2; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dow = d.getDay(); // 0=Sun..6=Sat
    if (dow === 1 || dow === 3 || dow === 5) {
      w -= 0.15 + Math.random() * 0.1;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      entries.push({ date: `${y}-${m}-${day}`, weight: Math.round(w * 10) / 10 });
    }
  }
  return entries;
}

export const pumpWording = ["Bad", "Poor", "Mid", "Good", "Very good"];
export const sorenessWording = ["Very sore", "Sore", "Slightly sore", "No soreness", "Fully healed"];
export const jointReasonLabels = ["Noticed only", "Mild, trained on", "Limited a set", "Stopped the set"];
export const removeSetReasons = [
  "Ran out of time",
  "Station taken, couldn't wait",
  "Pain or joint issue",
  "Too fatigued to do it properly",
  "Felt like I'd done enough",
];
