export type ClientStatus = "on-track" | "behind" | "at-risk" | "paused" | "unassigned";
export type FlagType = "volume-proposal" | "joint" | "weigh-in-missed" | "swap-needed";

export interface ClientFlag {
  id: string;
  type: FlagType;
  note: string;
  evidence?: string;
  tagLabel: string;
}

export interface CoachClient {
  id: string;
  name: string;
  initials: string;
  status: ClientStatus;
  /** Absent/"client" is a fully prescribed roster member, same as the rest of this demo. "friend" is a
   * self-directed friend-or-family account: they build or clone their own programs, but you can still
   * view and edit anything they set up. */
  role?: "client" | "friend";
  /** The invite code sent to this person, before they've accepted it. */
  inviteCode?: string;
  /** Set once this person has actually claimed their invite — their real Supabase account id, and the key
   * to load their live client_state. Undefined (status stays "unassigned") until then. */
  accountId?: string;
  programName: string;
  week: number;
  totalWeeks: number;
  adherencePct: number;
  flags: ClientFlag[];
  lastSessionSummary?: string;
  loadHistory: number[]; // 7-week bar chart, relative 0-100
  recentSessions: { label: string; status: "Complete" | "Partial" }[];
}

/** How a set's load is expressed in the program builder — the coach picks whichever fits how they actually prescribe. */
export type LoadMode = "lb" | "pct1rm" | "rpe" | "rir";

/** Strength exercises are logged as reps + load; cardio exercises are logged as work/rest durations — a jog is one long "set", intervals are several short ones. */
export type ExerciseKind = "strength" | "cardio";

export interface BuilderSet {
  id: string;
  reps: number; // strength only
  loadValue: number; // strength only — interpreted per the program's loadMode
  warmup: boolean; // strength only
  workSec?: number; // cardio only — duration of this block/interval
  restSec?: number; // rest after this set/block — strength sets default it by compound vs. isolation, cardio blocks default to 0
}

export interface BuilderExercise {
  id: string;
  name: string;
  muscle: string;
  kind: ExerciseKind;
  sets: BuilderSet[];
  /** When set, this exercise ignores the program's load mode and uses its own — for the one exercise you always track differently. */
  loadModeOverride?: LoadMode;
}

export interface BuilderDay {
  id: string;
  name: string;
  exercises: BuilderExercise[];
}

export interface CoachProgram {
  id: string;
  name: string;
  status: "published" | "draft";
  weeks: number;
  daysPerWeek: number;
  /** One load mode for the whole program — every exercise's sets are entered in this unit. */
  effortScale: LoadMode;
  assignedCount: number;
  weeklySets: number;
  phaseWeights: [number, number, number]; // accumulation, intensification, deload
  progressPct: number;
  days: BuilderDay[];
  /** A personal template stays private to you — it can never be set to a public listing, only assigned to your own clients. */
  isTemplate?: boolean;
  /** Templates are always "private"; a non-template can be published to a public listing. Defaults to "private" when absent. */
  visibility?: "private" | "public";
}

export interface LibraryExercise {
  id: string;
  name: string;
  muscle: string;
  hasVideo: boolean;
  kind?: ExerciseKind; // defaults to "strength" when absent
}

export interface CoachThread {
  id: string;
  clientId: string;
  clientName: string;
  context: string;
  unread: boolean;
  time: string;
  preview: string;
  isBroadcast?: boolean;
  bubbles: { from: "coach" | "client"; text: string; time: string; attached?: string; receipt?: string }[];
}
