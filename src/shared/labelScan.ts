import { supabase } from "../lib/supabase";
import type { FoodItem } from "../data/foodDatabase";

/** Photographed nutrition label -> one food, through the serverless endpoint that holds the API key.
 *
 * Its own file rather than an addition to aiImport.ts: that module is about programs -- DraftDay, exercise
 * names, training frequency -- and folding a food type into it would tie two unrelated features together
 * for no gain beyond saving a file.
 *
 * Throws with a message worth showing rather than returning a null nobody can act on, matching
 * parseProgramWithAi. */

export interface LabelReadResult {
  food: FoodItem;
  /** Anything the model guessed, converted, or couldn't read. Shown before the food is used. */
  notes?: string[];
}

/** Custom foods live in the account's own `customFoods`, so the id only has to be unique within one
 * person's list. Prefixed so a food that came from a label is recognisable later. */
function labelFoodId(): string {
  return `label-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export async function readLabelWithAi(image: { mediaType: string; data: string }): Promise<LabelReadResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again — your session expired.");

  const res = await fetch("/api/read-label", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "That didn't work. Try again in a moment.");
  }

  const raw = (await res.json()) as Record<string, unknown>;
  // The schema is a request, not a promise -- coerce rather than trust, the same way aiImport does.
  const food: FoodItem = {
    id: labelFoodId(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Scanned food",
    brand: typeof raw.brand === "string" && raw.brand.trim() ? raw.brand.trim() : undefined,
    servingLabel: typeof raw.servingLabel === "string" && raw.servingLabel.trim() ? raw.servingLabel.trim() : "1 serving",
    kcal: num(raw.kcal),
    protein: num(raw.protein),
    carbs: num(raw.carbs),
    fat: num(raw.fat),
  };
  const notes = Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === "string") : undefined;
  return { food, notes: notes?.length ? notes : undefined };
}

/** A still from the live camera, as a File the existing downscaler accepts.
 *
 * Taken from the video element that is ALREADY running for the barcode scanner rather than opening a file
 * picker or a second camera stream: the permission is granted, the camera is warm, and the person is
 * already pointing it at the packet. Returns null when the video has no frame yet. */
export async function captureFrame(video: HTMLVideoElement): Promise<File | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) return null;
  return new File([blob], "label.jpg", { type: "image/jpeg" });
}
