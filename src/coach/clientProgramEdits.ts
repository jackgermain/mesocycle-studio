import { supabase } from "../lib/supabase";
import type { Program } from "../data/types";
import { addWarmupSetByName, replaceExerciseByName } from "../shared/programEdits";
import { equipmentOf } from "../screens/exerciseHelpers";
import type { LibraryExercise } from "./types";

/** Read-modify-write of a client's live program, from the coach's side. Same access pattern and the same
 * RLS permission as writeProgramToClient in assignProgram.ts -- a coach may update the client_state row of
 * one of their own clients -- but for a surgical edit rather than a wholesale replacement.
 *
 * Returns how many places the edit landed, or null if it couldn't be applied at all. Zero is a real
 * answer, not a failure: it means the exercise the client named isn't in any session they have left. */
async function editClientProgram(clientAccountId: string, edit: (p: Program) => { program: Program; touched: number }): Promise<number | null> {
  const { data, error: readError } = await supabase.from("client_state").select("data").eq("account_id", clientAccountId).maybeSingle();
  if (readError) {
    console.error("Failed to read client state", readError);
    return null;
  }
  const existing = (data?.data as Record<string, unknown>) ?? {};
  const program = existing.program as Program | undefined;
  if (!program) return null;

  const { program: nextProgram, touched } = edit(program);
  if (touched === 0) return 0;

  const { error } = await supabase
    .from("client_state")
    .upsert({ account_id: clientAccountId, data: { ...existing, program: nextProgram }, updated_at: new Date().toISOString() });
  if (error) {
    console.error("Failed to write client state", error);
    return null;
  }
  return touched;
}

/** Adds a warm-up set to every remaining session of an exercise a client reported pain on. */
export function addWarmupSetForClient(clientAccountId: string, exerciseName: string): Promise<number | null> {
  return editClientProgram(clientAccountId, (p) => addWarmupSetByName(p, exerciseName));
}

/** Swaps out an exercise a client reported pain on, for the rest of their block. Scoped to the whole
 * remainder rather than a single day on purpose: a coach responding to joint pain is deciding the movement
 * is a bad fit, not that today is inconvenient. */
export function swapExerciseForClient(clientAccountId: string, exerciseName: string, replacement: LibraryExercise): Promise<number | null> {
  return editClientProgram(clientAccountId, (p) =>
    replaceExerciseByName(p, exerciseName, {
      name: replacement.name,
      muscle: replacement.muscle,
      equipment: equipmentOf({ name: replacement.name }),
      hasVideo: replacement.hasVideo,
    }),
  );
}
