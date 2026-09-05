import { supabase } from "../lib/supabase";

export const FORM_CHECK_BUCKET = "form-checks";
/** Matches the bucket's own file_size_limit in migration 0016. Checked here as well so someone gets a
 * sentence instead of a failed upload after waiting for a 90MB file to go up. */
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export interface FormCheck {
  id: string;
  client_id: string;
  coach_id: string;
  exercise_name: string;
  day_label: string | null;
  day_id: string | null;
  video_path: string;
  note: string | null;
  coach_reply: string | null;
  created_at: string;
  answered_at: string | null;
}

/** True once migration 0016 has actually been run. The repo's migrations are applied by hand, so the code
 * can ship before the SQL does -- and a client tapping "form check" into a 404 is a worse outcome than
 * the button not being there yet. Cached after the first answer; a miss costs one HEAD request. */
let available: boolean | null = null;

export async function formChecksAvailable(): Promise<boolean> {
  if (available !== null) return available;
  const { error } = await supabase.from("form_checks").select("id", { count: "exact", head: true }).limit(1);
  // 42P01 is "relation does not exist" -- the migration hasn't been run. Any other error (a network blip,
  // an auth problem) shouldn't permanently disable the feature, so it isn't cached as unavailable.
  if (error && (error.code === "42P01" || /does not exist/i.test(error.message))) {
    available = false;
    return false;
  }
  available = !error;
  return available;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
}

export interface NewFormCheck {
  clientId: string;
  coachId: string;
  exerciseName: string;
  dayLabel?: string | null;
  dayId?: string | null;
  note?: string | null;
  file: File;
}

/** Uploads the clip, then files the request. In that order deliberately: a row pointing at a video that
 * failed to upload is a broken card on the coach's desk with no way to tell why, whereas an uploaded file
 * with no row is invisible and harmless. */
export async function sendFormCheck(input: NewFormCheck): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: `That clip is ${Math.round(input.file.size / 1048576)}MB — keep it under 60MB (a few seconds of the working set is plenty).` };
  }

  // The leading folder must be the uploader's account id: the storage policies in 0016 authorise on it.
  const path = `${input.clientId}/${crypto.randomUUID()}.${extensionFor(input.file)}`;
  const { error: uploadError } = await supabase.storage
    .from(FORM_CHECK_BUCKET)
    .upload(path, input.file, { contentType: input.file.type || "video/mp4", upsert: false });
  if (uploadError) {
    console.error("Form check upload failed", uploadError);
    return { ok: false, error: "The video didn't upload. Check your connection and try again." };
  }

  const { error } = await supabase.from("form_checks").insert({
    client_id: input.clientId,
    coach_id: input.coachId,
    exercise_name: input.exerciseName,
    day_label: input.dayLabel ?? null,
    day_id: input.dayId ?? null,
    video_path: path,
    note: input.note?.trim() || null,
  });
  if (error) {
    // Don't leave the orphan behind -- it counts against storage and nothing will ever reference it.
    await supabase.storage.from(FORM_CHECK_BUCKET).remove([path]);
    console.error("Form check insert failed", error);
    return { ok: false, error: "Couldn't send that to your coach. Try again in a moment." };
  }
  return { ok: true };
}

export async function listFormChecks(onlyUnanswered = false): Promise<FormCheck[]> {
  let q = supabase.from("form_checks").select("*").order("created_at", { ascending: false });
  if (onlyUnanswered) q = q.is("answered_at", null);
  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01") console.error("Failed to load form checks", error);
    return [];
  }
  return (data ?? []) as FormCheck[];
}

/** The bucket is private, so playback needs a short-lived signed URL rather than a public link. An hour is
 * long enough to watch and reply, short enough that a copied URL isn't a permanent leak. */
export async function formCheckVideoUrl(videoPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(FORM_CHECK_BUCKET).createSignedUrl(videoPath, 3600);
  if (error) {
    console.error("Failed to sign form check video", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function answerFormCheck(id: string, reply: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("form_checks")
    .update({ coach_reply: reply.trim(), answered_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("Failed to answer form check", error);
    return false;
  }
  // Same reasoning as deleteFeedback: an update RLS refuses doesn't error, it matches zero rows.
  if (!data || data.length === 0) {
    console.error("Form check answer affected no rows -- not permitted for this account");
    return false;
  }
  return true;
}
