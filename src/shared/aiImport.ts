import { supabase } from "../lib/supabase";
import type { DraftDay } from "./programConvert";

export interface AiProgramResult {
  name?: string;
  weeks?: number;
  /** How often this trains. The days list holds the distinct sessions; this says how many sessions a
   * week they add up to, and the app fills the gap. */
  daysPerWeek?: number;
  days: DraftDay[];
  /** What the model had to guess, couldn't read, or interpreted. Shown to the coach before they accept. */
  notes?: string[];
}

export const AI_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

/** Serverless functions take a few MB of request body at most, and a modern phone photo is bigger than
 * that on its own -- before base64 adds a third again. Downscaling also cuts what the model has to read,
 * which is faster and cheaper, and 1600px is still far more than enough to read a printed set-and-rep
 * grid. PDFs pass through untouched: rasterizing them would throw away the text layer that makes them
 * accurate in the first place. */
const MAX_EDGE = 1600;
const MAX_BYTES = 4_000_000;

async function downscale(file: File): Promise<{ mediaType: string; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't read that image.");
  return { mediaType: "image/jpeg", data: await toBase64(blob) };
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      // Strip the "data:<type>;base64," prefix -- the API wants the payload alone.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export async function prepareFile(file: File): Promise<{ mediaType: string; data: string }> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_BYTES) throw new Error("That PDF is too big — try one under 4MB, or screenshot the pages you need.");
    return { mediaType: "application/pdf", data: await toBase64(file) };
  }
  return downscale(file);
}

/** Sends the attachments and the coach's instructions to the serverless endpoint, which holds the API key.
 * Throws with a message worth showing rather than returning a null nobody can act on. */
/** Repeats the distinct sessions across the week the coach actually asked for.
 *
 * This exists so the model never has to know that the length of the days array is what decides training
 * frequency. That's an app detail, and making an instruction depend on it meant "7 days a week" worked or
 * didn't depending on how it was phrased -- the model would sometimes return one day and a note saying it
 * repeats, which built a once-a-week program. Now it can answer either way and both are right: state the
 * frequency, list the sessions once, and the repetition happens here where it's just arithmetic.
 *
 * Cycles rather than pads, so two distinct days over four sessions alternate A B A B. */
export function expandToFrequency(days: DraftDay[], daysPerWeek?: number): DraftDay[] {
  const target = Math.min(7, Math.max(0, Math.round(daysPerWeek ?? 0)));
  if (days.length === 0 || target <= days.length) return days;

  const repeats = new Map<string, number>();
  return Array.from({ length: target }, (_, i) => {
    const source = days[i % days.length];
    const seen = (repeats.get(source.name) ?? 0) + 1;
    repeats.set(source.name, seen);
    return {
      ...source,
      // Only suffixed when it actually repeats, so a genuine Upper/Lower split keeps its own names.
      name: target > days.length ? `${source.name} ${String.fromCharCode(64 + seen)}` : source.name,
      exercises: source.exercises.map((e) => ({ ...e })),
    };
  });
}

export async function parseProgramWithAi(
  files: { mediaType: string; data: string }[],
  instructions: string,
): Promise<AiProgramResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again — your session expired.");

  const res = await fetch("/api/parse-program", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ files, instructions }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.diagnostic === "string" ? ` (${body.diagnostic})` : "";
    throw new Error((body?.error ?? "That didn't work. Try again in a moment.") + detail);
  }

  const result = (await res.json()) as AiProgramResult;
  if (!Array.isArray(result.days) || result.days.length === 0) {
    throw new Error(result.notes?.[0] ?? "Nothing readable came back — try a clearer photo.");
  }
  return { ...result, days: expandToFrequency(result.days, result.daysPerWeek) };
}
