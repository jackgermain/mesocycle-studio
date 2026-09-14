import type { CoachProgram } from "./types";
import {
  buildTemplate,
  CATEGORY_LABELS,
  WOMENS_TEMPLATE_SPECS,
  type TemplateCategory,
  type TemplateSex,
  type TemplateSpec,
} from "./womensTemplates";

/** The templates that ship with the app, as opposed to the ones a coach saves.
 *
 * Until now `listCoachTemplates()` was the only source, and it reads a coach's own `coach_state` -- so a
 * template written in code was unreachable no matter how good it was. Jack, on the six-day glute split:
 * "that one needs to be an official one 100%... Put that one up on the app now." This is the way in.
 *
 * ## The grid
 *
 * Jack's six kinds across five frequencies for both populations: **6 x 5 x 2 = 60**, which is the number he
 * set. `coverage()` reports which cells are filled so the gap is countable rather than guessed at, and
 * `missingCells()` says exactly what is left to write.
 *
 * A cell may hold more than one template -- four of the women's full-body two-day templates are variants of
 * the same cell -- so the count of templates and the count of covered cells are different numbers and are
 * reported separately.
 */

export const FREQUENCIES = [2, 3, 4, 5, 6] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const CATEGORY_ORDER: TemplateCategory[] = [
  "full-body",
  "lower-emphasis",
  "upper-emphasis",
  "lower-specialty",
  "upper-specialty",
  "dumbbell-home",
];

export interface BuiltInTemplate {
  program: CoachProgram;
  category: TemplateCategory;
  sex: TemplateSex;
  frequency: number;
}

const ALL_SPECS: readonly TemplateSpec[] = [...WOMENS_TEMPLATE_SPECS];

/** Every shipped template, expanded. Built once at module load: these are constants, and rebuilding 60
 * programs on each render of a browsing screen would be wasteful for no gain. */
export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = ALL_SPECS.map((spec) => ({
  program: buildTemplate(spec),
  category: spec.category,
  sex: spec.sex,
  frequency: spec.days.length,
}));

/** Templates for one population, in category order then by descending frequency, which is how they are
 * browsed: pick the kind of program first, then how many days you can train. */
export function templatesFor(sex: TemplateSex): BuiltInTemplate[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.sex === sex).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.frequency - a.frequency ||
      a.program.name.localeCompare(b.program.name),
  );
}

export function groupedByCategory(sex: TemplateSex): { category: TemplateCategory; label: string; templates: BuiltInTemplate[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    templates: templatesFor(sex).filter((t) => t.category === category),
  })).filter((g) => g.templates.length > 0);
}

export interface Coverage {
  /** 60 when every kind exists at every frequency for both populations. */
  cellsFilled: number;
  cellsTotal: number;
  templates: number;
}

export function coverage(): Coverage {
  const cells = new Set(BUILT_IN_TEMPLATES.map((t) => `${t.sex}/${t.category}/${t.frequency}`));
  return {
    cellsFilled: cells.size,
    cellsTotal: CATEGORY_ORDER.length * FREQUENCIES.length * 2,
    templates: BUILT_IN_TEMPLATES.length,
  };
}

/** What is still to be written, as concrete cells rather than a number. Kept in the shipping code rather
 * than a scratch note because it is the work list, and a work list that lives outside the repo goes stale
 * the moment someone adds a template. */
export function missingCells(): { sex: TemplateSex; category: TemplateCategory; frequency: number }[] {
  const have = new Set(BUILT_IN_TEMPLATES.map((t) => `${t.sex}/${t.category}/${t.frequency}`));
  const out: { sex: TemplateSex; category: TemplateCategory; frequency: number }[] = [];
  for (const sex of ["women", "men"] as const) {
    for (const category of CATEGORY_ORDER) {
      for (const frequency of FREQUENCIES) {
        if (!have.has(`${sex}/${category}/${frequency}`)) out.push({ sex, category, frequency });
      }
    }
  }
  return out;
}
