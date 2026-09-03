import { supabase } from "../lib/supabase";
import type { Program } from "../data/types";
import type { CoachProgram } from "./types";
import { blankState } from "./store";

/** Writes a real Program straight into a client's own client_state row -- the same place their live
 * training data already lives, so it shows up exactly like anything the client built themselves. RLS
 * already allows a coach to update a client_state row belonging to one of their own clients, so this is
 * a plain read-merge-write rather than needing a SECURITY DEFINER function. Only the `program` field is
 * touched; everything else (profile, weigh-ins, meals, onboarded) is preserved untouched. */
export async function writeProgramToClient(clientAccountId: string, program: Program): Promise<void> {
  const { data, error: readError } = await supabase.from("client_state").select("data").eq("account_id", clientAccountId).maybeSingle();
  if (readError) throw readError;
  const existing = (data?.data as Record<string, unknown>) ?? {};
  // Replacing the active program also clears any previously queued one -- it was queued to follow the
  // program that's now being replaced, so it no longer makes sense to auto-start it later.
  const next = { ...existing, program, nextProgram: null };
  const { error } = await supabase.from("client_state").upsert({ account_id: clientAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Queues a program to start automatically once the client's current one finishes (its last day gets
 * logged/removed), rather than replacing what they're on right now. See PROMOTE_NEXT_PROGRAM in
 * src/state/store.tsx for the client-side promotion. */
export async function queueProgramForClient(clientAccountId: string, program: Program): Promise<void> {
  const { data, error: readError } = await supabase.from("client_state").select("data").eq("account_id", clientAccountId).maybeSingle();
  if (readError) throw readError;
  const existing = (data?.data as Record<string, unknown>) ?? {};
  const next = { ...existing, nextProgram: program };
  const { error } = await supabase.from("client_state").upsert({ account_id: clientAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Adds a new template straight into a coach's own coach_state.programs -- used when a program built from
 * inside the client-facing screens (e.g. "Train as myself" importing a spreadsheet) should also become a
 * reusable template, without mounting the full CoachStoreProvider tree those screens don't have. Same
 * plain read-merge-write pattern as writeProgramToClient above; RLS already allows a coach to update their
 * own coach_state row. */
export async function writeTemplateToCoach(coachAccountId: string, template: CoachProgram): Promise<void> {
  const { data, error: readError } = await supabase.from("coach_state").select("data").eq("account_id", coachAccountId).maybeSingle();
  if (readError) throw readError;
  // Merge onto blankState(), not `{}` -- the coach's own CoachStoreProvider only hydrates a row when
  // `remote.clients` is present (see coach/store.tsx), so writing a row missing that field (e.g. because no
  // coach_state row existed yet) would leave the row permanently invisible to the coach's own dashboard on
  // next load, even though the data was technically saved.
  const existing = { ...blankState(), ...((data?.data as Partial<ReturnType<typeof blankState>>) ?? {}) };
  const next = { ...existing, programs: [template, ...existing.programs] };
  const { error } = await supabase.from("coach_state").upsert({ account_id: coachAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
