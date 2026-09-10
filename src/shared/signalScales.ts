/** What counts as worth a coach's attention, per scale. No Supabase client import on purpose.
 *
 * `lib/supabase` reads `import.meta.env` at module load, which only exists under Vite, so anything that
 * imports it cannot be reached from a test at all. These are the parts worth testing — the thresholds and
 * which direction each scale runs — so they live on this side of that line and `signals.ts` re-exports
 * them for existing callers.
 *
 * The directions are the thing that gets read backwards:
 *
 *  - pump      1..5 Bad → Very good. LOW is bad.
 *  - soreness  1..5 Very sore → Fully healed. LOW is bad.
 *  - joint     1..4 Noticed only → Stopped the set. HIGH is bad.
 *  - effort    1..5 Easy → Could not have done another rep. HIGH is the noteworthy end.
 *  - nutrition two shapes. detail "missed" means nothing was logged all day and severity is 0; otherwise
 *              severity is the day's miss in kcal, absolute. Not a 1..5 scale at all — it is a magnitude,
 *              and only sent once the miss is already past the tolerance below.
 */
export type SignalKind = "pump" | "joint" | "soreness" | "effort" | "nutrition";

export const PUMP_ALERT_BELOW = 3;
export const SORENESS_ALERT_BELOW = 3;
export const JOINT_ALERT_AT_OR_ABOVE = 2;
export const JOINT_URGENT_AT_OR_ABOVE = 3;
/** Only a 5 is sent at all, so anything that arrives is alerting by definition. */
export const EFFORT_ALERT_AT = 5;

/** How far off a day can land and still count as on target. The nutrition screen has always said "within
 * 50 kcal and 10 g protein counts as on target"; this is that sentence, as a number the code can use. */
export const KCAL_TOLERANCE = 50;
export const PROTEIN_TOLERANCE = 10;

/** Was the day far enough off to be worth telling the coach? Direction-agnostic: 700 under and 700 over
 * are both worth knowing, and they mean opposite things. */
export function isNutritionAlerting(kcalMiss: number): boolean {
  return Math.abs(kcalMiss) > KCAL_TOLERANCE;
}

/** Worded the way a client thinks about a set rather than as a number to convert. RIR inverted and
 * bounded: a 5 is RIR 0, a 1 is roughly four or more left. */
export const EFFORT_WORDING = ["Easy", "Moderate", "Hard", "Very hard", "Nothing left"] as const;

export function isPumpAlerting(severity: number): boolean {
  return severity < PUMP_ALERT_BELOW;
}
export function isSorenessAlerting(severity: number): boolean {
  return severity < SORENESS_ALERT_BELOW;
}
export function isJointAlerting(severity: number): boolean {
  return severity >= JOINT_ALERT_AT_OR_ABOVE;
}
export function isJointUrgent(severity: number): boolean {
  return severity >= JOINT_URGENT_AT_OR_ABOVE;
}
export function isEffortAlerting(severity: number): boolean {
  return severity >= EFFORT_ALERT_AT;
}
