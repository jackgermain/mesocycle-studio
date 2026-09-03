import type { CoachProgram } from "../coach/types";
import { supabase } from "../lib/supabase";

/** A friend/family account's own coach's saved personal templates, via a narrow RPC that exposes just
 * that subset of her coach_state — never the rest of her roster or drafts. */
export async function listCoachTemplates(): Promise<CoachProgram[]> {
  const { data, error } = await supabase.rpc("get_coach_templates");
  if (error || !data) return [];
  return data as CoachProgram[];
}
