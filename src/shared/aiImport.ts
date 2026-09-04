import { supabase } from "../lib/supabase";
import type { DraftDay } from "./programConvert";

export interface AiProgramResult {
  name?: string;
  weeks?: number;
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
    throw new Error(body?.error ?? "That didn't work. Try again in a moment.");
  }

  const result = (await res.json()) as AiProgramResult;
  if (!Array.isArray(result.days) || result.days.length === 0) {
    throw new Error(result.notes?.[0] ?? "Nothing readable came back — try a clearer photo.");
  }
  return result;
}
