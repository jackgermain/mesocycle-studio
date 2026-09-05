export type ClientStatus = "on-track" | "behind" | "at-risk" | "paused" | "unassigned";
export type FlagType = "volume-proposal" | "joint" | "weigh-in-missed" | "swap-needed";

export interface ClientFlag {
  id: string;
  type: FlagType;
  note: string;
  evidence?: string;
  tagLabel: string;
}

/** One record of a program being put on someone, and why.
 *
 * Written at the moment of assignment because it cannot be reconstructed afterwards. The program itself
 * gets edited, templates get renamed and deleted, and a coach's reasoning is never anywhere at all -- so
 * six weeks later "why is this person on this?" has no answer, and across a roster there is no way to see
 * which template suits which kind of person.
 *
 * This is the dataset that eventually says whether template selection could be automated, and the audit
 * trail for a decision in the meantime. `answers` is the slot for the intake questionnaire: a snapshot of
 * what was true when the choice was made, not a live pointer, since the person's answers will change. */
export interface ProgramAssignment {
  at: string;
  programId: string;
  programName: string;
  totalWeeks: number;
  mode: "now" | "queued";
  /** The template it was cloned from, when it was cloned from one. */
  sourceProgramId?: string;
  /** Why this program for this person, in the coach's own words. */
  reason?: string;
  /** Intake answers as they stood at assignment time. Unshaped on purpose -- the questionnaire doesn't
   * exist yet, and a record written today should still be readable once it does. */
  answers?: Record<string, unknown>;
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
  /** The CoachProgram currently backing their live assignment — lets "Edit their current program" reopen
   * the exact same working copy instead of starting over or duplicating again. */
  assignedProgramId?: string;
  /** Set when a new program has been queued to start once their current one's block ends, rather than
   * replacing it immediately. */
  queuedProgramId?: string;
  /** Every program this person has been put on, oldest first. Append-only. */
  assignments?: ProgramAssignment[];
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
  /** What an AI edit last touched — see AiEditMark in data/types.ts. */
  lastAiEdit?: import("../data/types").AiEditMark;
  /** Which weekdays this program trains, as offsets from Monday (0=Mon … 6=Sun), sorted, one per day slot.
   * Absent means "spread evenly across the week", which is what every program did before this was
   * pickable -- so leaving it unset keeps an existing program's dates exactly as they were. */
  trainingDows?: number[];
  id: string;
  name: string;
  status: "published" | "draft";
  weeks: number;
  /** Whether the last week is a deload. Defaults to true when absent, which is what every program built
   * before this was a choice assumed -- the builder hardcoded "the last week is the deload". */
  hasDeload?: boolean;
  /** An open-ended block: it runs until the coach ends it, and `weeks` is just how far it has been built
   * out so far rather than a finish line. Implies no deload -- there is no "last week" to deload. */
  openEnded?: boolean;
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
  /** A working copy built for one specific client's assignment — hidden from the main Programs list so
   * every assign attempt doesn't clutter your library. Cleared (and the program becomes a normal, visible
   * saved program) the moment you check "Save as a personal template". */
  pendingForClientId?: string;
  /** Same idea, for a program started with no client in mind yet (Programs tab's own "+" -> "Build from
   * scratch"/"Import a program") — hidden and exit-guarded exactly like pendingForClientId until it's
   * either explicitly saved or actually assigned to someone. */
  pendingUnsaved?: boolean;
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
