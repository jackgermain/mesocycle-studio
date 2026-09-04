import { supabase } from "../lib/supabase";

export type SignalKind = "pump" | "joint" | "soreness";

export interface ClientSignal {
  id: string;
  client_id: string;
  coach_id: string;
  kind: SignalKind;
  muscle: string | null;
  severity: number;
  note: string | null;
  day_label: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

/** What's worth a coach's attention, per the scales in data/mockData.ts:
 *
 *  - pump      1..5 as Bad → Very good, so a low number is the bad one. Under 3 is Bad or Poor.
 *  - soreness  1..5 as Very sore → Fully healed, low again meaning still wrecked. Under 3 is Very sore
 *              or Sore, i.e. showing up to train it again while it hasn't recovered.
 *  - joint     1..4 as "Noticed only" → "Stopped the set", and this one runs the *other* way: higher is
 *              worse. There's no harmless level here, so any reported joint pain is sent, with 3+
 *              ("Limited a set" / "Stopped the set") treated as urgent.
 */
export const PUMP_ALERT_BELOW = 3;
export const SORENESS_ALERT_BELOW = 3;
export const JOINT_URGENT_AT_OR_ABOVE = 3;

export function isPumpAlerting(severity: number): boolean {
  return severity < PUMP_ALERT_BELOW;
}
export function isSorenessAlerting(severity: number): boolean {
  return severity < SORENESS_ALERT_BELOW;
}
export function isJointUrgent(severity: number): boolean {
  return severity >= JOINT_URGENT_AT_OR_ABOVE;
}

interface NewSignal {
  kind: SignalKind;
  muscle?: string | null;
  severity: number;
  note?: string | null;
  dayLabel?: string | null;
}

/** Sends session feedback to the client's own coach. Silently does nothing when there's no coach to send
 * to -- a coach training themselves, or a coach account generally, has coach_id null, and there's no one
 * on the other end to notify. Never throws into a submit handler: failing to record feedback shouldn't
 * block finishing a workout, so a failure is logged and swallowed. */
export async function sendSignals(clientId: string, coachId: string | null, signals: NewSignal[]): Promise<void> {
  if (!coachId || signals.length === 0) return;
  const rows = signals.map((s) => ({
    client_id: clientId,
    coach_id: coachId,
    kind: s.kind,
    muscle: s.muscle ?? null,
    severity: s.severity,
    note: s.note ?? null,
    day_label: s.dayLabel ?? null,
  }));
  const { error } = await supabase.from("client_signals").insert(rows);
  if (error) console.error("Failed to send client signals", error);
}

/** Everything this coach's clients have reported and the coach hasn't cleared yet. */
export async function listOpenSignals(): Promise<ClientSignal[]> {
  const { data, error } = await supabase
    .from("client_signals")
    .select("*")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load client signals", error);
    return [];
  }
  return (data ?? []) as ClientSignal[];
}

/** Same caveat as deleteFeedback: an update RLS refuses reports success with zero rows touched, so the
 * affected rows are read back rather than trusting the absence of an error. */
export async function acknowledgeSignal(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("client_signals")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("Failed to acknowledge signal", error);
    return false;
  }
  return !!data && data.length > 0;
}

export interface FeedbackNote {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
}

/** App/bug feedback, from anyone using the app, to whoever owns the platform. */
export async function sendFeedback(authorId: string, body: string): Promise<boolean> {
  const { error } = await supabase.from("feedback").insert({ author_id: authorId, body });
  if (error) {
    console.error("Failed to send feedback", error);
    return false;
  }
  return true;
}

/** Deleting is how the platform owner clears a note they've dealt with -- which is also why the number of
 * remaining notes is the badge count, with no separate read/unread state to keep in sync. */
export async function deleteFeedback(id: string): Promise<boolean> {
  // .select() matters here: a delete RLS refuses doesn't error, it just matches zero rows and reports
  // success. Without asking for the deleted rows back there's no way to tell "removed" from "silently
  // refused", and the UI would drop the note from the list while the database still had it.
  const { data, error } = await supabase.from("feedback").delete().eq("id", id).select("id");
  if (error) {
    console.error("Failed to delete feedback", error);
    return false;
  }
  if (!data || data.length === 0) {
    console.error("Feedback delete affected no rows -- not permitted for this account");
    return false;
  }
  return true;
}

export async function listFeedbackForAdmin(): Promise<FeedbackNote[]> {
  const { data, error } = await supabase.rpc("list_feedback_for_admin");
  if (error) {
    console.error("Failed to load feedback", error);
    return [];
  }
  return (data ?? []) as FeedbackNote[];
}
