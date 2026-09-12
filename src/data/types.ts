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
  /** How hard this set was, 1 (easy) to 5 (could not have done another rep) — RIR inverted and bounded,
   * asked in the language a client thinks in rather than a number they have to convert.
   *
   * Only collected on two sets per exercise, and they answer different questions. The second-to-last
   * decides what the LAST set should do; the last decides what NEXT WEEK should do. Absent on every other
   * set, and on any set logged before this existed. */
  effort?: number;
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
  /** Sets on this exercise are measured in seconds, not reps -- planks, carries, holds. `reps` on each
   * set holds the duration. Set by the coach per exercise; see BuilderExercise.timed. */
  timed?: boolean;
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
  /** When next week's proposed numbers for this session were sent for review. Marked before sending, so a
   * re-render or a reload never sends the same session twice. Absent on sessions from before it existed. */
  progressionSentAt?: string;
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

  /* The nutrition algorithm's inputs — see shared/nutritionPlan.ts and doctrine/nutrition-v1.md.
   *
   * All four are optional and every reader must tolerate undefined. HYDRATE replaces `profile` wholesale
   * rather than merging field by field, so any account saved before today arrives without them. */

  /** Body-fat estimate, percent. Picks the maintenance formula (no sex is stored anywhere, which rules out
   * Mifflin-St Jeor and leaves Katch-McArdle off lean mass) and decides N5's raised cut cap. */
  bodyFatPct?: number;
  /** The maintenance figure targets are an offset from (N1). Estimated to begin with, then corrected from
   * their own weigh-ins by N6 — the scale beats the formula. */
  maintenanceKcal?: number;
  /** Desired rate as a percent of bodyweight per week, negative to lose. Stored as the number rather than
   * only as `rateTargetLabel` prose, because N3's cap and N6's correction both have to compute against it. */
  rateTargetPct?: number;
  /** When on, calories and macros are recomputed from maintenance and the capped rate instead of being
   * hand-set, and maintenance itself is re-derived from the weigh-in trend. */
  autoNutrition?: boolean;
  /** When on, finishing a session sends next week's proposed numbers for review. Off stops the proposal
   * being generated at all.
   *
   * Read as `=== false`, never as `!autoProgressions`: proposals send for everyone today, and HYDRATE
   * replaces `profile` wholesale rather than merging, so every account saved before this field existed
   * arrives with `undefined`. A falsy check would switch a live feature off for the entire roster on their
   * next load. Absent means on. */
  autoProgressions?: boolean;
}

export interface LoggedFoodItem {
  id: string;
  /** ISO yyyy-mm-dd this was logged on.
   *
   * Meals were previously one undated running list that was never cleared, so nothing could tell what
   * was eaten on which day -- food logged on Monday was still sitting there on Thursday, and a coach had
   * no way to ask whether someone logged anything yesterday. Optional because entries made before this
   * existed have no date and must not be counted as either logged or missed. */
  loggedAt?: string;
  /** Ticked off as actually eaten, the same gesture as checking off a set.
   *
   * Undefined rather than false for anything added before this existed, and undefined counts — a food
   * log that silently zeroed itself the day this shipped would be worse than no change at all. New items
   * start explicitly false, so they are planned until ticked. */
  eaten?: boolean;
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
  /** ISO yyyy-mm-dd the meal was submitted, the way an exercise is finished rather than just started.
   * Absent means still open: food has been added and maybe ticked off, but the meal isn't closed. */
  submittedAt?: string;
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
