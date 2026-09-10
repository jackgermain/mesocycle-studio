import { supabase } from "../lib/supabase";
import type { SignalKind } from "./signalScales";

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
  /** Added in migration 0014, so signals recorded before it ran have neither. */
  exercise?: string | null;
  detail?: string | null;
  /** Added in 0015. The session this came from, as opposed to day_label's human "Day 1". */
  day_id?: string | null;
}

/* The scales themselves live in signalScales.ts, which imports no Supabase client so a test can reach
   them. Re-exported here so every existing caller keeps working. */
export type { SignalKind } from "./signalScales";
export {
  PUMP_ALERT_BELOW, SORENESS_ALERT_BELOW, JOINT_ALERT_AT_OR_ABOVE, JOINT_URGENT_AT_OR_ABOVE,
  EFFORT_ALERT_AT, EFFORT_WORDING,
  isPumpAlerting, isSorenessAlerting, isJointAlerting, isJointUrgent, isEffortAlerting,
} from "./signalScales";

interface NewSignal {
  kind: SignalKind;
  muscle?: string | null;
  severity: number;
  note?: string | null;
  dayLabel?: string | null;
  exercise?: string | null;
  detail?: string | null;
  dayId?: string | null;
}

/** Sends session feedback to the client's own coach. Silently does nothing when there's no coach to send
 * to -- a coach training themselves, or a coach account generally, has coach_id null, and there's no one
 * on the other end to notify. Never throws into a submit handler: failing to record feedback shouldn't
 * block finishing a workout, so a failure is logged and swallowed. */
export async function sendSignals(clientId: string, coachId: string | null, signals: NewSignal[]): Promise<void> {
  if (!coachId || signals.length === 0) return;
  const base = signals.map((s) => ({
    client_id: clientId,
    coach_id: coachId,
    kind: s.kind,
    muscle: s.muscle ?? null,
    severity: s.severity,
    note: s.note ?? null,
    day_label: s.dayLabel ?? null,
  }));
  const rows = base.map((r, i) => ({
    ...r,
    exercise: signals[i].exercise ?? null,
    detail: signals[i].detail ?? null,
    day_id: signals[i].dayId ?? null,
  }));

  const { error } = await supabase.from("client_signals").insert(rows);
  if (!error) return;

  // Migrations here are applied by hand, so a deploy can briefly run ahead of the database. PostgREST
  // rejects the whole insert when a column it doesn't know about is named -- which would mean no coach
  // gets notified of anything until someone runs the SQL. Retry without the new columns instead, folding
  // the detail into the note so the words at least survive; the exercise name is the part that's lost.
  if (error.code === "PGRST204") {
    console.warn("client_signals is missing columns from migration 0014 or 0015 -- run them in supabase/migrations/");
    const legacy = base.map((r, i) => {
      const extra = [signals[i].exercise, signals[i].detail].filter(Boolean).join(" · ");
      return { ...r, note: [r.note, extra].filter(Boolean).join(" · ") || null };
    });
    const retry = await supabase.from("client_signals").insert(legacy);
    if (retry.error) console.error("Failed to send client signals", retry.error);
    return;
  }
  console.error("Failed to send client signals", error);
}

/** Recent history for this coach's clients, cleared or not. The open ones are what needs action; the
 * cleared ones are what makes a repeat visible -- the same shoulder reported three weeks running matters
 * far more than any single report, and that's invisible if you only ever look at what's currently open. */
export async function listRecentSignals(days = 90): Promise<ClientSignal[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("client_signals")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load client signals", error);
    return [];
  }
  return (data ?? []) as ClientSignal[];
}

/** One signal, for acting on it after navigating away from the desk. RLS already limits this to the coach
 * it was sent to and the client who sent it, so no extra guard is needed here. */
export async function getSignal(id: string): Promise<ClientSignal | null> {
  const { data, error } = await supabase.from("client_signals").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Failed to load signal", error);
    return null;
  }
  return (data as ClientSignal | null) ?? null;
}

/** How many times this client has raised this same thing before -- same kind, and same body area for
 * joint pain or same muscle for soreness. Counts the whole recent history, not just what's still open. */
export function recurrenceCount(all: ClientSignal[], s: ClientSignal): number {
  const key = (x: ClientSignal) => `${x.client_id}|${x.kind}|${(x.note ?? x.muscle ?? "").toLowerCase()}`;
  return all.filter((x) => key(x) === key(s)).length;
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
