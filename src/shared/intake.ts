import { MUSCLE_GROUPS } from "../coach/exerciseLibrary";

/** What the app knows about a person before it programmes for them.
 *
 * Everything here is optional. A half-finished intake is worth more than none, and the generator's job is
 * to say what it can't determine rather than to refuse — see docs/WORKOUT-GENERATOR.md. `completedAt` is
 * the only signal that someone has actually been through it, so a blank field means "not answered" and
 * never "answered as empty".
 *
 * Free text sits alongside the structured fields rather than instead of them. The structured half is what
 * rules can compute against; the free text is where the things nobody anticipated live — a shoulder that
 * only complains after benching, a job that means no mornings — and it's what the model reads. */

export type TrainingAge = "new" | "under-2" | "2-5" | "5-10" | "10-plus";
export type Goal = "muscle" | "strength" | "fat-loss" | "general-health" | "sport";
export type SessionLength = "under-45" | "45-60" | "60-90" | "90-plus";
export type GymAccess = "full-gym" | "home-basic" | "home-full" | "bodyweight" | "other";

export interface Intake {
  /** Null until they've been through it once. The only reliable "have they done this" signal. */
  completedAt: string | null;
  /** Bumped whenever the question set changes materially, so an old intake can be spotted and re-asked
   * rather than silently treated as current. */
  version: number;

  age?: number;
  trainingAge?: TrainingAge;
  goal?: Goal;
  sessionsPerWeek?: number;
  sessionLength?: SessionLength;
  gymAccess?: GymAccess;

  /** Free text, in their words. Read by the model, never by a rule. */
  equipmentNotes?: string;
  injuries?: string;
  conditions?: string;
  /** Muscles they say recover slowly, from the same taxonomy the library uses, so it can be matched. */
  slowToRecover?: string[];
  anythingElse?: string;
}

export const INTAKE_VERSION = 1;

export const TRAINING_AGE_LABELS: Record<TrainingAge, string> = {
  new: "Brand new",
  "under-2": "Under 2 years",
  "2-5": "2–5 years",
  "5-10": "5–10 years",
  "10-plus": "10+ years",
};

export const GOAL_LABELS: Record<Goal, string> = {
  muscle: "Build muscle",
  strength: "Get stronger",
  "fat-loss": "Lose fat",
  "general-health": "General health",
  sport: "Sport performance",
};

export const SESSION_LENGTH_LABELS: Record<SessionLength, string> = {
  "under-45": "Under 45 min",
  "45-60": "45–60 min",
  "60-90": "60–90 min",
  "90-plus": "90+ min",
};

export const GYM_ACCESS_LABELS: Record<GymAccess, string> = {
  "full-gym": "Full commercial gym",
  "home-full": "Well-equipped home gym",
  "home-basic": "Basic home setup",
  bodyweight: "Bodyweight only",
  other: "Something else",
};

/** The muscles worth asking about by name. The full library taxonomy is too long to tap through, and
 * "Full body" isn't a muscle. */
export const RECOVERY_MUSCLES = MUSCLE_GROUPS.filter((m) => m !== "Full body");

export function blankIntake(): Intake {
  return { completedAt: null, version: INTAKE_VERSION };
}

/** Enough to programme from. Deliberately not "every field": demanding completeness turns intake into a
 * wall, and the four here are the ones a starting point genuinely cannot be chosen without. */
export function isIntakeUsable(i: Intake | undefined | null): boolean {
  return !!i && !!i.trainingAge && !!i.goal && !!i.sessionsPerWeek && !!i.gymAccess;
}

export function isIntakeStale(i: Intake | undefined | null): boolean {
  return !!i?.completedAt && (i.version ?? 0) < INTAKE_VERSION;
}

/** A compact, human-readable rendering for the coach's screen and for the generator's prompt.
 *
 * One place on purpose: what a coach reads and what the model reads should not be able to disagree about
 * what someone said. */
export function summariseIntake(i: Intake | undefined | null): string[] {
  if (!i) return [];
  const out: string[] = [];
  if (i.age) out.push(`${i.age} years old`);
  if (i.trainingAge) out.push(`Training: ${TRAINING_AGE_LABELS[i.trainingAge]}`);
  if (i.goal) out.push(`Goal: ${GOAL_LABELS[i.goal]}`);
  if (i.sessionsPerWeek) out.push(`${i.sessionsPerWeek}× a week`);
  if (i.sessionLength) out.push(SESSION_LENGTH_LABELS[i.sessionLength]);
  if (i.gymAccess) out.push(GYM_ACCESS_LABELS[i.gymAccess]);
  if (i.equipmentNotes?.trim()) out.push(`Equipment: ${i.equipmentNotes.trim()}`);
  if (i.injuries?.trim()) out.push(`Injuries: ${i.injuries.trim()}`);
  if (i.conditions?.trim()) out.push(`Conditions: ${i.conditions.trim()}`);
  if (i.slowToRecover?.length) out.push(`Slow to recover: ${i.slowToRecover.join(", ")}`);
  if (i.anythingElse?.trim()) out.push(i.anythingElse.trim());
  return out;
}
