import { supabase } from "../lib/supabase";
import type { BuilderDay } from "../coach/types";
import type { OverrideMap, TemplateOverride } from "./templateOverrideApply";

export { applyOverride } from "./templateOverrideApply";
export type { OverrideMap, TemplateOverride } from "./templateOverrideApply";

/** Reading and writing the template edits that apply to every account.
 *
 * The built-in templates are code constants, so renaming or deleting one in the app cannot change the
 * bundle. Instead every change is a row in `template_overrides` (migration 0029), read by every signed-in
 * account on load and layered over the shipped list. One write changes what everybody sees.
 *
 * The pure half -- how an override is applied -- lives in templateOverrideApply.ts, because this file
 * creates the Supabase client at import time and therefore cannot be imported by a test.
 *
 * **Every read fails soft.** 0029 is applied by hand, and this project has been bitten before by code that
 * assumed a migration was live: 0002 sat committed and unrun for months while get_coach_templates silently
 * returned []. A missing table, a network failure, or an unapplied policy all resolve to "no overrides", and
 * the app shows the shipped library exactly as it does today. It cannot empty the Templates screen by being
 * absent.
 */

export async function fetchTemplateOverrides(): Promise<OverrideMap> {
  try {
    const { data, error } = await supabase
      .from("template_overrides")
      .select("template_id, name, hidden, days");
    if (error || !data) return {};
    const out: OverrideMap = {};
    for (const row of data as { template_id: string; name: string | null; hidden: boolean; days: BuilderDay[] | null }[]) {
      out[row.template_id] = { templateId: row.template_id, name: row.name, hidden: row.hidden, days: row.days };
    }
    return out;
  } catch {
    return {};
  }
}

/** Write one override for everybody. Only the platform admin's write passes 0029's policy; for anyone else
 * the database refuses it, which is the real gate -- the UI hiding the controls is not access control. */
export async function saveTemplateOverride(o: TemplateOverride): Promise<void> {
  const { error } = await supabase.from("template_overrides").upsert(
    {
      template_id: o.templateId,
      name: o.name ?? null,
      hidden: o.hidden ?? false,
      days: o.days ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "template_id" },
  );
  if (error) throw new Error(error.message);
}

/** Puts a template back to exactly what ships in the bundle, by removing its override entirely. */
export async function clearTemplateOverride(templateId: string): Promise<void> {
  const { error } = await supabase.from("template_overrides").delete().eq("template_id", templateId);
  if (error) throw new Error(error.message);
}
