export type Units = "lb" | "kg";
export type EffortScale = "RIR" | "RPE" | "%1RM";
export type SetType = "straight" | "amrap" | "backoff" | "dropset" | "myo" | "cluster";
export type AssistanceType = "none" | "band" | "machine" | "spotter" | "eccentric" | "weighted" | "part-band";

export interface ClusterSpec {
  clusters: number;
  repsPerCluster: number[];
  intraRestSec: number;
}

export interface TempoSpec {
  eccentric: number;
  isometric: number;
  concentric: number;
  holdAt: "bottom" | "top" | "mid";
}

export interface AssistanceSpec {
  type: AssistanceType;
  detail?: string; // e.g. "Thin band" or "-40 lb assisted machine"
  splitUnassisted?: number;
  splitAssisted?: number;
}

export interface SetPrescribed {
  reps: number | string; // string for "6+" amrap display
  load: number | null; // in program's canonical unit (kg), null for bodyweight
  effort: { scale: EffortScale; value: number | string };
  restSec: number | null;
  tempo?: TempoSpec;
  assistance?: AssistanceSpec;
  cluster?: ClusterSpec;
}

export interface SetActual {
  reps: number;
  load: number | null;
  clusterBlocks?: number[];
  assistanceSplit?: { unassisted: number; assisted: number };
}

export interface WorkSet {
  id: string;
  index: number;
  type: SetType;
  prescribed: SetPrescribed;
  actual: SetActual | null;
  checked: boolean;
  removed?: { reason: string };
  lastWeek?: string;
  isWarmup?: boolean;
}

export interface ExerciseSetup {
  heelLift?: string;
  depth?: string;
  rom?: string;
  stance?: string;
  bar?: string;
  cue?: string;
}

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";

export interface WorkExercise {
  id: string;
  name: string;
  muscle: string;
  /** Which unit this exercise's sets were prescribed in. Absent on programs built before this existed --
   * see loadModeOf in ExerciseSection for the fallback that reads it back off the sets. */
  loadMode?: import("../coach/types").LoadMode;
  metaLine: string;
  hasVideo: boolean;
  equipment?: Equipment;
  setup?: ExerciseSetup;
  sets: WorkSet[];
}

export type DayStatus = "done" | "today" | "visible";

export interface DayLog {
  sessionSets: number;
  sessionTotal: number;
  tonnage: string;
  timeMin: number;
  pumpAvg: number;
}

export interface TrainingDay {
  id: string;
  code: string; // U1, L1, U2, L2
  label: string; // "Upper A"
  dow: string; // "Mon"
  date: string; // ISO yyyy-mm-dd, the real calendar date this session falls on
  status: DayStatus;
  muscleSummary: string;
  setCount: number;
  order: string[]; // exercise ids in current order
  exercises: Record<string, WorkExercise>;
  log?: DayLog;
  feedbackDone?: boolean;
  sorenessDone?: boolean;
  /** The pre-session soreness check, kept rather than discarded once answered.
   *
   * `recoveredOnDay` is how many days after the last session the soreness stopped, and it is the number
   * the volume rule needs: the target is to finish healing one day before the muscle is trained again,
   * so anything earlier means there was room for more work. 0 means it never got sore. Absent when the
   * client was still sore, which needs no follow-up -- that case is already unambiguous. */
  sorenessAnswers?: Record<string, { severity: number; lastTrainedDaysAgo: number; recoveredOnDay?: number }>;
}

export interface TrainingWeek {
  number: number;
  phase: "accumulation" | "intensification" | "deload";
  opensLabel?: string;
  days: TrainingDay[];
}

/** What an AI edit touched, kept so the change is still visible after the review sheet closes. Lives on
 * the program itself rather than in component state so it survives navigation and reload -- the point is
 * that a coach can come back later and still see what wasn't their own hand. Cleared once dismissed. */
export interface AiEditMark {
  at: string;
  summary: string;
  exerciseIds: string[];
}

export interface Program {
  lastAiEdit?: AiEditMark;
  name: string;
  totalWeeks: number;
  coachName: string;
  weeks: TrainingWeek[];
}

export type NutritionMode = "off" | "macros" | "portions";
export type PortionUnit = "palm" | "fist" | "cupped hand" | "thumb" | "plate";
export type PortionCategory = "Protein" | "Carbs" | "Vegetables" | "Fat";

export interface PortionTarget {
  category: PortionCategory;
  unit: PortionUnit;
  qty: number; // for unit "plate", a fraction (0.25, 0.33, 0.5, 1); otherwise a count of that hand-portion
}

export interface ClientProfile {
  name: string;
  units: Units;
  smallestPlate: string;
  heightLabel: string;
  bodyweight: number;
  effortScale: EffortScale;
  weighInsPerWeek: 0 | 3 | 5;
  weighInDays: string[];
  nutritionMode: NutritionMode;
  macroTargets: { kcal: number; protein: number; carbs: number; fat: number; trainingDayCarbBonus: number };
  portionTargets: PortionTarget[];
  rateTargetLabel: string;
}

export interface LoggedFoodItem {
  id: string;
  foodId: string;
  name: string;
  servingLabel: string;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSection {
  id: string;
  name: string;
  items: LoggedFoodItem[];
  portionsHit?: PortionCategory[];
}

export interface WeighIn {
  date: string; // ISO yyyy-mm-dd
  weight: number;
}

export interface RemovalRecord {
  exerciseName: string;
  setIndex: number;
  reason: string;
  dayLabel: string;
}
