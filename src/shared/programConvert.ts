import type { CoachProgram, LoadMode } from "../coach/types";
import type { EffortScale, Program, TrainingDay, TrainingWeek, WorkExercise, WorkSet } from "../data/types";
import { equipmentOf } from "../screens/exerciseHelpers";
import { defaultRestSec } from "../coach/rest";
import { LOAD_DEFAULT } from "../coach/loadMode";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function shortDow(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function effortForLoadMode(loadMode: LoadMode, loadValue: number): { scale: EffortScale; value: number | string } {
  if (loadMode === "rpe") return { scale: "RPE", value: loadValue };
  if (loadMode === "rir") return { scale: "RIR", value: loadValue };
  if (loadMode === "pct1rm") return { scale: "%1RM", value: loadValue };
  return { scale: "RIR", value: 2 };
}
function loadForLoadMode(loadMode: LoadMode, loadValue: number): number | null {
  return loadMode === "lb" ? loadValue : null;
}
/** Only meaningful once `prescribed.load` is already known to be null -- that's what actually marks a set
 * as effort-based rather than a plain weight (see loadForLoadMode above), since older data always carried
 * an RIR scale as a default even on plain-lb sets. */
function loadModeFromScale(scale: EffortScale | undefined): LoadMode {
  if (scale === "RPE") return "rpe";
  if (scale === "%1RM") return "pct1rm";
  return "rir";
}

/** Spreads N day slots evenly across a 7-day week, same placement rule the seed data uses for a 4-day
 * split (0, 1, 3, 5 → Mon/Tue/Thu/Sat). */
/** Which weekday (as an offset from Monday) a given day slot lands on. An explicit `dows` selection wins;
 * without one, slots spread as evenly as 7 days allow, which is what every program did before picking
 * training days was possible. */
function offsetForSlot(i: number, daysPerWeek: number, dows?: number[]): number {
  if (dows && dows.length) return dows[Math.min(i, dows.length - 1)];
  return Math.floor((i * 7) / Math.max(1, daysPerWeek));
}

/** Every program's weekly pattern is authored as if Day 1 (slot 0) always falls on a Monday. If today
 * really is Monday, week 1 just starts today, same as always. Otherwise, week 1 doesn't start until the
 * *next* Monday -- but rather than leaving the rest of this calendar week empty, whichever slots would
 * normally land on or after today (this week) run as a partial "week 0", reusing the exact same day
 * content week 1 will use for that slot. Someone starting on a Wednesday gets that pattern's Wednesday
 * slot today, plus anything later this week, instead of just waiting until Monday to begin. */
function scheduleWeeks(daysPerWeek: number, totalWeeks: number, dows?: number[]): { weekNumber: number; slot: number; date: Date }[] {
  const todayDow = TODAY.getDay(); // 0=Sun..6=Sat
  const daysToMonday = todayDow === 1 ? 0 : (8 - todayDow) % 7;
  const week1Monday = addDays(TODAY, daysToMonday);
  const schedule: { weekNumber: number; slot: number; date: Date }[] = [];

  if (daysToMonday > 0) {
    const thisWeekMonday = addDays(week1Monday, -7);
    for (let i = 0; i < daysPerWeek; i++) {
      const date = addDays(thisWeekMonday, offsetForSlot(i, daysPerWeek, dows));
      if (date >= TODAY) schedule.push({ weekNumber: 0, slot: i, date });
    }
  }

  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
    for (let i = 0; i < daysPerWeek; i++) {
      schedule.push({ weekNumber, slot: i, date: addDays(week1Monday, (weekNumber - 1) * 7 + offsetForSlot(i, daysPerWeek, dows)) });
    }
  }
  return schedule;
}

/** Expands a coach's builder program — one template week of days, repeated `weeks` times — into the
 * client app's live, per-week Program shape, with every set freshly unlogged. Cardio exercises aren't
 * represented in the client logging model yet, so they're skipped rather than mis-converted. */
export function expandCoachProgramToProgram(cp: CoachProgram, coachName: string): Program {
  const daysPerWeek = cp.days.length || cp.daysPerWeek || 1;
  const todayIso = isoDate(TODAY);
  const weekMap = new Map<number, TrainingDay[]>();

  for (const { weekNumber, slot: i, date } of scheduleWeeks(daysPerWeek, cp.weeks, cp.trainingDows)) {
    const bd = cp.days[i];
    if (!bd) continue;
    const exercises: Record<string, WorkExercise> = {};
    const order: string[] = [];
    let setCount = 0;
    const muscles = new Set<string>();

    for (const bex of bd.exercises) {
      if (bex.kind === "cardio") continue;
      const loadMode = bex.loadModeOverride ?? cp.effortScale;
      const sets: WorkSet[] = bex.sets.map((s, si) => ({
        id: `${bex.id}-s${si + 1}`,
        index: si + 1,
        type: "straight",
        prescribed: {
          reps: s.reps,
          load: loadForLoadMode(loadMode, s.loadValue),
          effort: effortForLoadMode(loadMode, s.loadValue),
          restSec: s.restSec ?? defaultRestSec(bex.name),
        },
        actual: null,
        checked: false,
        isWarmup: s.warmup,
      }));
      exercises[bex.id] = {
        id: bex.id,
        name: bex.name,
        muscle: bex.muscle,
        metaLine: `${sets.length} sets`,
        hasVideo: false,
        equipment: equipmentOf({ name: bex.name }),
        sets,
      };
      order.push(bex.id);
      setCount += sets.length;
      muscles.add(bex.muscle.toLowerCase());
    }

    const day: TrainingDay = {
      id: `w${weekNumber}-d${i + 1}`,
      code: `D${i + 1}`,
      label: bd.name,
      dow: shortDow(date),
      date: isoDate(date),
      status: isoDate(date) === todayIso ? "today" : "visible",
      muscleSummary: Array.from(muscles).slice(0, 4).join(", "),
      setCount,
      order,
      exercises,
    };
    if (!weekMap.has(weekNumber)) weekMap.set(weekNumber, []);
    weekMap.get(weekNumber)!.push(day);
  }

  const weeks: TrainingWeek[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([number, days]) => ({ number, phase: "accumulation", days }));

  return { name: cp.name, totalWeeks: cp.weeks, coachName, weeks };
}

export interface DraftExercise {
  name: string;
  muscle: string;
  /** Only ever set by the spreadsheet importer — a from-scratch build always falls back to the plain
   * 3×10 default below, same as before this existed. */
  sets?: number;
  reps?: number;
  /** The load value in whatever unit `loadMode` implies — pounds, %1RM, an RPE, or an RIR. Not always a
   * literal weight, despite the name (kept for backward compatibility with the CSV importer's field). */
  load?: number;
  /** Defaults to "lb" when absent, matching the coach builder's own per-exercise default. */
  loadMode?: LoadMode;
}
export interface DraftDay {
  name: string;
  exercises: DraftExercise[];
}

/** Turns a from-scratch draft — day names plus the exercises picked for each — into a one-week-template
 * Program repeated across `weeks` weeks. Each exercise is seeded either with whatever sets/reps/load the
 * draft specified (the spreadsheet importer's case) or a plain 3×10 starting point the builder can then
 * edit like any other set. */
export function buildProgramFromDraft(name: string, days: DraftDay[], weeksCount: number, ownerName: string, dows?: number[]): Program {
  const daysPerWeek = days.length || 1;
  const todayIso = isoDate(TODAY);
  const weekMap = new Map<number, TrainingDay[]>();

  for (const { weekNumber, slot: i, date } of scheduleWeeks(daysPerWeek, weeksCount, dows)) {
    const dd = days[i];
    if (!dd) continue;
    const exercises: Record<string, WorkExercise> = {};
    const order: string[] = [];
    let setCount = 0;
    const muscles = new Set<string>();

    dd.exercises.forEach((de, ei) => {
      const id = `w${weekNumber}-d${i + 1}-e${ei + 1}`;
      const restSec = defaultRestSec(de.name);
      const setCountForEx = Math.max(1, de.sets ?? 3);
      const loadMode = de.loadMode ?? "lb";
      const loadValue = de.load ?? (loadMode === "lb" ? 0 : LOAD_DEFAULT[loadMode]);
      const sets: WorkSet[] = Array.from({ length: setCountForEx }, (_, si) => si + 1).map((setIndex) => ({
        id: `${id}-s${setIndex}`,
        index: setIndex,
        type: "straight",
        prescribed: { reps: de.reps ?? 10, load: loadForLoadMode(loadMode, loadValue), effort: effortForLoadMode(loadMode, loadValue), restSec },
        actual: null,
        checked: false,
      }));
      exercises[id] = {
        id,
        name: de.name,
        muscle: de.muscle,
        metaLine: `${sets.length} sets`,
        hasVideo: false,
        equipment: equipmentOf({ name: de.name }),
        sets,
      };
      order.push(id);
      setCount += sets.length;
      muscles.add(de.muscle.toLowerCase());
    });

    const day: TrainingDay = {
      id: `w${weekNumber}-d${i + 1}`,
      code: `D${i + 1}`,
      label: dd.name,
      dow: shortDow(date),
      date: isoDate(date),
      status: isoDate(date) === todayIso ? "today" : "visible",
      muscleSummary: Array.from(muscles).slice(0, 4).join(", "),
      setCount,
      order,
      exercises,
    };
    if (!weekMap.has(weekNumber)) weekMap.set(weekNumber, []);
    weekMap.get(weekNumber)!.push(day);
  }

  const outWeeks: TrainingWeek[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([number, outDays]) => ({ number, phase: "accumulation", days: outDays }));

  return { name, totalWeeks: weeksCount, coachName: ownerName, weeks: outWeeks };
}

/** One DraftDay per day-of-week slot in a running program, built from the first not-yet-done occurrence of
 * each slot (so editing shows real current numbers, not stale ones from an already-finished week). Used to
 * pre-fill the "edit mesocycle" builder with what's actually still ahead. */
export function draftDaysFromProgram(program: Program): DraftDay[] {
  const daysPerWeek = program.weeks[0]?.days.length ?? 0;
  const slots: DraftDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    const source = program.weeks.map((w) => w.days[i]).find((d) => d && d.status !== "done") ?? program.weeks[0]?.days[i];
    if (!source) continue;
    const order = source.order.length ? source.order : Object.keys(source.exercises);
    slots.push({
      name: source.label,
      exercises: order
        .map((id) => source.exercises[id])
        .filter((e): e is WorkExercise => !!e)
        .map((e) => {
          const first = e.sets[0];
          const isLb = first?.prescribed.load != null;
          const loadMode: LoadMode = isLb ? "lb" : loadModeFromScale(first?.prescribed.effort.scale);
          const loadValue = isLb ? (first!.prescribed.load as number) : typeof first?.prescribed.effort.value === "number" ? (first.prescribed.effort.value as number) : undefined;
          return {
            name: e.name,
            muscle: e.muscle,
            sets: e.sets.length,
            reps: typeof first?.prescribed.reps === "number" ? (first.prescribed.reps as number) : undefined,
            load: loadValue,
            loadMode,
          };
        }),
    });
  }
  return slots;
}

/** Applies an edited day/exercise list back onto a program that's already running, day-slot by day-slot
 * (slot 0 = every week's first day, etc) -- and only to days that haven't happened yet. A day already
 * marked "done" is returned completely untouched, logged sets and all: the whole point of editing an
 * in-progress mesocycle is changing what's still ahead, never rewriting history. Slot count/order/dates
 * are left alone; only each not-done day's exercises (and its slot's name) are regenerated the same way
 * buildProgramFromDraft builds a fresh day, so edited exercises show up with real, loggable sets. */
export function mergeEditedDraftIntoProgram(existing: Program, days: DraftDay[], name: string): Program {
  const weeks: TrainingWeek[] = existing.weeks.map((week) => {
    const outDays: TrainingDay[] = week.days.map((day, i) => {
      if (day.status === "done") return day;
      const dd = days[i];
      if (!dd) return day;

      const exercises: Record<string, WorkExercise> = {};
      const order: string[] = [];
      let setCount = 0;
      const muscles = new Set<string>();

      dd.exercises.forEach((de, ei) => {
        const id = `w${week.number}-d${i + 1}-e${ei + 1}`;
        const restSec = defaultRestSec(de.name);
        const setCountForEx = Math.max(1, de.sets ?? 3);
        const loadMode = de.loadMode ?? "lb";
        const loadValue = de.load ?? (loadMode === "lb" ? 0 : LOAD_DEFAULT[loadMode]);
        const sets: WorkSet[] = Array.from({ length: setCountForEx }, (_, si) => si + 1).map((setIndex) => ({
          id: `${id}-s${setIndex}`,
          index: setIndex,
          type: "straight",
          prescribed: { reps: de.reps ?? 10, load: loadForLoadMode(loadMode, loadValue), effort: effortForLoadMode(loadMode, loadValue), restSec },
          actual: null,
          checked: false,
        }));
        exercises[id] = {
          id,
          name: de.name,
          muscle: de.muscle,
          metaLine: `${sets.length} sets`,
          hasVideo: false,
          equipment: equipmentOf({ name: de.name }),
          sets,
        };
        order.push(id);
        setCount += sets.length;
        muscles.add(de.muscle.toLowerCase());
      });

      return { ...day, label: dd.name, muscleSummary: Array.from(muscles).slice(0, 4).join(", "), setCount, order, exercises };
    });
    return { ...week, days: outDays };
  });

  return { ...existing, name, weeks };
}
