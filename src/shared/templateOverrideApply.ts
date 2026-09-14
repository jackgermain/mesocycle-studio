import type { BuilderDay, CoachProgram } from "../coach/types";

/** How a stored override changes a shipped template. Pure -- no Supabase import.
 *
 * Split out from templateOverrides.ts for a concrete reason: that module creates the Supabase client at
 * import time, and `lib/supabase.ts` reads `import.meta.env`, which is undefined under the Node test
 * runner. So importing it from a test throws before a single assertion runs. This function decides what
 * 125 templates look like for every account, which makes it exactly the kind of logic this project keeps
 * testable -- the same reason progressionProposal.ts and nutritionPlan.ts carry no Supabase import. */

export interface TemplateOverride {
  templateId: string;
  name?: string | null;
  hidden?: boolean;
  /** The whole edited week, when the contents were changed. Null/undefined means contents untouched. */
  days?: BuilderDay[] | null;
}

export type OverrideMap = Record<string, TemplateOverride>;

/** The template as it should appear, or null when it has been deleted for everyone.
 *
 * weeklySets and daysPerWeek are recomputed rather than carried across: an edit that removes sets has to
 * change the numbers shown beside the template, or the card advertises volume the program no longer has. */
export function applyOverride(program: CoachProgram, override: TemplateOverride | undefined): CoachProgram | null {
  if (!override) return program;
  if (override.hidden) return null;

  const days = override.days?.length ? override.days : program.days;
  const weeklySets = days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets.length, 0), 0);

  return {
    ...program,
    name: override.name?.trim() ? override.name.trim() : program.name,
    days,
    weeklySets,
    daysPerWeek: days.length,
  };
}
