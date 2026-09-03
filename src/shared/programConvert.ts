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
function offsetForSlot(i: number, daysPerWeek: number): number {
  return Math.floor((i * 7) / Math.max(1, daysPerWeek));
}

/** Expands a coach's builder program — one template week of days, repeated `weeks` times — into the
 * client app's live, per-week Program shape, with every set freshly unlogged. Cardio exercises aren't
 * represented in the client logging model yet, so they're skipped rather than mis-converted. */
export function expandCoachProgramToProgram(cp: CoachProgram, coachName: string): Program {
  const daysPerWeek = cp.days.length || cp.daysPerWeek || 1;
  const weeks: TrainingWeek[] = [];

  for (let weekNumber = 1; weekNumber <= cp.weeks; weekNumber++) {
    const days: TrainingDay[] = cp.days.map((bd, i) => {
      const date = addDays(TODAY, (weekNumber - 1) * 7 + offsetForSlot(i, daysPerWeek));
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
        status: weekNumber === 1 && i === 0 ? "today" : "visible",
        muscleSummary: Array.from(muscles).slice(0, 4).join(", "),
        setCount,
        order,
        exercises,
      };
      return day;
    });

    weeks.push({ number: weekNumber, phase: "accumulation", days });
  }

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
export function buildProgramFromDraft(name: string, days: DraftDay[], weeks: number, ownerName: string): Program {
  const daysPerWeek = days.length || 1;
  const outWeeks: TrainingWeek[] = [];

  for (let weekNumber = 1; weekNumber <= weeks; weekNumber++) {
    const outDays: TrainingDay[] = days.map((dd, i) => {
      const date = addDays(TODAY, (weekNumber - 1) * 7 + offsetForSlot(i, daysPerWeek));
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
        status: weekNumber === 1 && i === 0 ? "today" : "visible",
        muscleSummary: Array.from(muscles).slice(0, 4).join(", "),
        setCount,
        order,
        exercises,
      };
      return day;
    });

    outWeeks.push({ number: weekNumber, phase: "accumulation", days: outDays });
  }

  return { name, totalWeeks: weeks, coachName: ownerName, weeks: outWeeks };
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
