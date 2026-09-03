import type { CoachProgram } from "../coach/types";

const COACH_KEY = "mesocycle-coach-state-v6";

/** Reads the coach's saved personal templates straight out of her half of localStorage — the same
 * no-backend simulation the invite and nutrition bridges use. A friend/family account can browse these
 * and clone one for themself, but never sees the rest of her roster or drafts. */
export function listCoachTemplates(): CoachProgram[] {
  try {
    const raw = localStorage.getItem(COACH_KEY);
    if (!raw) return [];
    const state = JSON.parse(raw);
    const programs: CoachProgram[] = state?.programs ?? [];
    return programs.filter((p) => p.isTemplate);
  } catch {
    return [];
  }
}
