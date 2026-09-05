import type { BuilderDay, BuilderExercise, BuilderSet, CoachProgram, LoadMode } from "./types";
import type { DraftDay } from "../shared/programConvert";
import { defaultRestSec } from "./rest";
import { LOAD_DEFAULT } from "./loadMode";

/** True for any not-yet-confirmed working copy, whether it's tied to a specific client's assignment or
 * just a fresh "build from scratch"/"import" started with no client in mind yet. Hidden from the main
 * Programs list, and exit-guarded (save-as-draft or discard) until explicitly saved or actually assigned. */
export function isPendingProgram(p: CoachProgram): boolean {
  return !!p.pendingForClientId || !!p.pendingUnsaved;
}

function freshSetId(): string {
  return `bset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function freshExerciseId(): string {
  return `bex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function freshDayId(): string {
  return `bday-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A full, independent copy of one of the coach's programs -- fresh ids top to bottom so editing it (or
 * the original) never bleeds into the other, reset to an unpublished draft with no assignments of its
 * own yet. Used when assigning an existing program to a client: the coach gets their own editable copy
 * for that client instead of either a frozen snapshot or shared-state that would change for everyone
 * already on the original. */
export function duplicateProgram(source: CoachProgram, newName: string): CoachProgram {
  const days: BuilderDay[] = source.days.map((d) => ({
    id: freshDayId(),
    name: d.name,
    exercises: d.exercises.map((e) => ({
      id: freshExerciseId(),
      name: e.name,
      muscle: e.muscle,
      kind: e.kind,
      loadModeOverride: e.loadModeOverride,
      sets: e.sets.map((s) => ({ ...s, id: freshSetId() })),
    })),
  }));
  return {
    ...source,
    id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: newName,
    status: "draft",
    assignedCount: 0,
    isTemplate: false,
    visibility: undefined,
    days,
  };
}

/** Turns the spreadsheet importer's parsed rows into a real, fully-editable CoachProgram -- opened in the
 * normal builder afterward, same as building from scratch, so whatever the sheet got wrong is just as
 * fixable as anything else (drag to reorder, edit sets/reps/load, swap exercises). */
/** A saved template, back in the shape the build-a-program editor works in.
 *
 * Lossy in one way worth knowing: DraftExercise carries a single reps/load for a whole exercise, while a
 * template can prescribe a different number on every set. The first set's numbers are taken as the
 * exercise's, and per-set variation is flattened. That's a property of the editor, not of this function --
 * the spreadsheet import has always landed in the same place -- and it only applies when someone chooses
 * to edit a template rather than run it as written. */
export function coachProgramToDraft(cp: CoachProgram): { name: string; days: DraftDay[]; weeks: number } {
  return {
    name: cp.name,
    weeks: cp.weeks,
    days: (cp.days ?? []).map((d) => ({
      name: d.name,
      exercises: (d.exercises ?? [])
        // Cardio has no representation in the client logging model, so it is dropped here for the same
        // reason expandCoachProgramToProgram drops it rather than mis-converting it.
        .filter((e) => e.kind !== "cardio")
        .map((e) => {
          // Only a genuine per-exercise override travels. Stamping the program's own effortScale onto
          // every exercise made the builder open with RPE (or %1RM) preselected on all of them, when the
          // default for anything nobody has explicitly set is pounds.
          const mode = e.loadModeOverride;
          const inLb = (mode ?? cp.effortScale) === "lb";
          return {
            name: e.name,
            muscle: e.muscle,
            sets: e.sets.length || 1,
            reps: e.sets[0]?.reps,
            // A load only survives if it was already a weight. Carrying "7" across from an RPE-scaled
            // template into a field now labelled LB would silently turn RPE 7 into 7 pounds.
            load: inLb ? e.sets[0]?.loadValue : undefined,
            loadMode: mode,
          };
        }),
    })),
  };
}

export function csvDraftDaysToCoachProgram(name: string, days: DraftDay[], weeks: number): CoachProgram {
  // Most exercises share one load type -- whichever mode shows up most becomes the program default, so
  // individual exercises only need an override when they actually differ from the rest.
  const modeCounts = new Map<LoadMode, number>();
  for (const d of days) for (const e of d.exercises) if (e.loadMode) modeCounts.set(e.loadMode, (modeCounts.get(e.loadMode) ?? 0) + 1);
  const programDefaultMode: LoadMode = [...modeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "lb";

  const builderDays: BuilderDay[] = days.map((d) => ({
    id: freshDayId(),
    name: d.name,
    exercises: d.exercises.map((e): BuilderExercise => {
      const setCount = Math.max(1, e.sets ?? 3);
      const mode = e.loadMode ?? "lb";
      const loadValue = e.load ?? (mode === "lb" ? 0 : LOAD_DEFAULT[mode]);
      const sets: BuilderSet[] = Array.from({ length: setCount }, () => ({
        id: freshSetId(),
        reps: e.reps ?? 10,
        loadValue,
        warmup: false,
        restSec: defaultRestSec(e.name),
      }));
      return { id: freshExerciseId(), name: e.name, muscle: e.muscle, kind: "strength", sets, loadModeOverride: mode !== programDefaultMode ? mode : undefined };
    }),
  }));

  return {
    id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    status: "draft",
    weeks: Math.max(1, weeks),
    daysPerWeek: builderDays.length || 1,
    effortScale: programDefaultMode,
    assignedCount: 0,
    weeklySets: builderDays.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets.length, 0), 0),
    phaseWeights: [1, 0, 0],
    progressPct: 0,
    days: builderDays,
    isTemplate: false,
  };
}
