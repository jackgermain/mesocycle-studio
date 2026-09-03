import type { Equipment, WorkExercise, WorkSet } from "../data/types";

export function fmtLoad(load: number | null, units: string) {
  return load === null ? "BW" : `${load} ${units}`;
}

/** The actual weights a commercial dumbbell rack comes in — irregular jumps below 27.5 lb (fixed pairs), then a clean 5 lb jump the rest of the way. */
export const DUMBBELL_WEIGHTS = [
  2.5, 5, 10, 12.5, 17.5, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150,
];

/** An empty barbell — you can never load below this. */
export const BARBELL_WEIGHT = 45;

function nameHeuristic(ex: { name: string }): Equipment {
  const n = ex.name.toLowerCase();
  if (n.includes("dumbbell")) return "dumbbell";
  if (n.includes("barbell") || n.includes("deadlift")) return "barbell";
  if (n.includes("cable")) return "cable";
  return "machine";
}

export function equipmentOf(ex: { name: string; equipment?: Equipment }): Equipment {
  return ex.equipment ?? nameHeuristic(ex);
}

export function isDumbbellExercise(ex: { name: string; equipment?: Equipment }): boolean {
  return equipmentOf(ex) === "dumbbell";
}

/** Dumbbells snap through a fixed rack; a barbell moves in 5 lb total jumps (two 2.5 lb plates, the smallest pair that goes on evenly); a machine or cable stack moves in 10 lb jumps, matching a typical weight-stack plate. */
export function stepForEquipment(equipment: Equipment): number {
  if (equipment === "dumbbell") return 5;
  if (equipment === "barbell") return 5;
  if (equipment === "machine" || equipment === "cable") return 10;
  return 2.5;
}

export function stepForExercise(ex: { name: string; equipment?: Equipment }): number {
  return stepForEquipment(equipmentOf(ex));
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Move to the next/previous point on a fixed lattice (e.g. 45, 50, 55…) rather than adding a flat step — this snaps an off-grid value onto the grid instead of compounding the drift. */
function stepFlatLattice(current: number, direction: 1 | -1, step: number, floor: number): number {
  const eps = 1e-6;
  if (direction === 1) {
    const n = Math.floor((current - floor) / step + eps) + 1;
    return floor + n * step;
  }
  const n = Math.ceil((current - floor) / step - eps) - 1;
  return Math.max(floor, floor + n * step);
}

/** Snap an arbitrary raw weight to the nearest load that equipment actually has — used to seed prescribed loads and round warm-up math onto a real grid. */
export function snapLoadForEquipment(equipment: Equipment, raw: number): number {
  if (equipment === "dumbbell") {
    let closest = DUMBBELL_WEIGHTS[0];
    let bestDiff = Math.abs(raw - closest);
    for (const w of DUMBBELL_WEIGHTS) {
      const diff = Math.abs(raw - w);
      if (diff < bestDiff) {
        closest = w;
        bestDiff = diff;
      }
    }
    return closest;
  }
  const step = stepForEquipment(equipment);
  const floor = equipment === "barbell" ? BARBELL_WEIGHT : 0;
  return Math.max(floor, roundToStep(raw, step));
}

/** Move to the next/previous weight a dumbbell rack actually has, rather than an arithmetic step. */
export function stepDumbbellWeight(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = DUMBBELL_WEIGHTS.find((w) => w > current + 0.01);
    return next ?? DUMBBELL_WEIGHTS[DUMBBELL_WEIGHTS.length - 1];
  }
  const lower = [...DUMBBELL_WEIGHTS].reverse().find((w) => w < current - 0.01);
  return lower ?? DUMBBELL_WEIGHTS[0];
}

/** Step a load by an exercise's own equipment rules — dumbbell rack, barbell (never below the empty bar), or a flat step for everything else. Always lands on the equipment's real grid, even if the current value didn't start on it. */
export function stepLoad(ex: WorkExercise, current: number, direction: 1 | -1): number {
  const eq = equipmentOf(ex);
  if (eq === "dumbbell") return stepDumbbellWeight(current, direction);
  const step = stepForExercise(ex);
  const floor = eq === "barbell" ? BARBELL_WEIGHT : 0;
  return stepFlatLattice(current, direction, step, floor);
}

/** Snap an arbitrary raw number (e.g. half of a working weight, for a warm-up) to a load that equipment actually has. */
export function nearestValidLoad(ex: WorkExercise, raw: number): number {
  return snapLoadForEquipment(equipmentOf(ex), raw);
}

export function isSpecialSet(s: WorkSet) {
  if (s.type !== "straight" && s.type !== "amrap") return true;
  if (s.prescribed.tempo) return true;
  if (s.prescribed.assistance && s.prescribed.assistance.type !== "none") return true;
  return false;
}

export function typeLabel(type: string, s: WorkSet) {
  if (type === "cluster" && s.prescribed.cluster) {
    return `${s.prescribed.cluster.clusters} × ${s.prescribed.cluster.repsPerCluster[0]} / ${s.prescribed.cluster.intraRestSec}s rest`;
  }
  if (s.prescribed.tempo) return `${s.prescribed.reps} reps · iso ${s.prescribed.tempo.isometric}s at ${s.prescribed.tempo.holdAt}`;
  if (s.prescribed.assistance) return `${s.prescribed.reps} reps · ${s.prescribed.assistance.detail ?? s.prescribed.assistance.type}`;
  return `${s.prescribed.reps} reps`;
}

export function specialSummary(s: WorkSet) {
  if (s.type === "cluster" && s.actual?.clusterBlocks) {
    return `${s.actual.clusterBlocks.reduce((a, b) => a + b, 0)} reps · ${s.actual.clusterBlocks.join("+")}`;
  }
  if (s.actual?.assistanceSplit) {
    return `${s.actual.assistanceSplit.unassisted}+${s.actual.assistanceSplit.assisted} · ${s.actual.reps} reps`;
  }
  return `${s.actual?.load ? s.actual.load + " · " : ""}${s.actual?.reps} reps`;
}
