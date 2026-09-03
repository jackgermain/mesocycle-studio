import type { NutritionMode, PortionTarget } from "../data/types";

/**
 * The coach app and client app run as two separate stores in this demo (mirroring
 * "one backend, two apps"), so this is the one deliberate bridge between them:
 * the coach's saved nutrition protocol for a client, read back by that client's
 * own Nutrition/Progress screens. In a real backend this would just be a shared
 * row; here it's one small localStorage key both sides agree on.
 */

const KEY_PREFIX = "mesocycle-shared-protocol-";

export interface SharedNutritionProtocol {
  weighInsPerWeek: 0 | 3 | 5;
  weighInDays: string[];
  nutritionMode: NutritionMode;
  macroTargets: { kcal: number; protein: number; carbs: number; fat: number; trainingDayCarbBonus: number };
  portionTargets: PortionTarget[];
  rateTargetLabel: string;
  savedAt: string;
}

export function getSharedProtocol(clientId: string): SharedNutritionProtocol | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + clientId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSharedProtocol(clientId: string, protocol: Omit<SharedNutritionProtocol, "savedAt">) {
  localStorage.setItem(KEY_PREFIX + clientId, JSON.stringify({ ...protocol, savedAt: new Date().toISOString() }));
}
