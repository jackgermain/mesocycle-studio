import type { FoodItem } from "./foodDatabase";

/** USDA FoodData Central's standard nutrient IDs -- stable across their whole database, so matching by id
 * is reliable where matching by name text isn't (nutrient names vary in casing/wording between entries). */
const NUTRIENT_ID = { kcal: 1008, protein: 1003, carbs: 1005, fat: 1004 };

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface UsdaNutrient {
  nutrientId: number;
  value: number;
}
interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaNutrient[];
}

function nutrientValue(food: UsdaFood, nutrientId: number): number {
  return food.foodNutrients.find((n) => n.nutrientId === nutrientId)?.value ?? 0;
}

/** USDA's Branded Foods data is submitted by manufacturers and occasionally has real data-entry errors
 * upstream (a mistyped per-100g value on the label gets faithfully scaled down to "per serving" by USDA's
 * own pipeline, producing something like 65g of protein in a 32g bag of chips). The one thing that's never
 * physically possible regardless of the food: protein + carbs + fat weighing more than the serving itself
 * (water/fiber/ash/etc. always make up some of the remainder). Catches the worst of these without needing
 * to second-guess otherwise-plausible values. */
function isPhysicallyPlausible(grams: number, protein: number, carbs: number, fat: number): boolean {
  return protein + carbs + fat <= grams * 1.05;
}

/** USDA's search endpoint returns Branded entries with nutrient values already computed per that food's
 * own serving size (not per 100g) -- Foundation/SR Legacy (generic, non-branded) entries don't carry a
 * serving size at all, so those fall back to the per-100g values the API reports for them by default. */
function normalizeUsdaFood(food: UsdaFood): FoodItem | null {
  const kcal = nutrientValue(food, NUTRIENT_ID.kcal);
  if (!kcal) return null;
  const hasServing = typeof food.servingSize === "number" && food.servingSize > 0 && !!food.servingSizeUnit;
  const grams = hasServing && /^(g|grm|ml)$/i.test(food.servingSizeUnit!) ? food.servingSize! : 100;
  const protein = Math.round(nutrientValue(food, NUTRIENT_ID.protein) * 10) / 10;
  const carbs = Math.round(nutrientValue(food, NUTRIENT_ID.carbs) * 10) / 10;
  const fat = Math.round(nutrientValue(food, NUTRIENT_ID.fat) * 10) / 10;
  if (!isPhysicallyPlausible(grams, protein, carbs, fat)) return null;
  return {
    id: `usda-${food.fdcId}`,
    name: titleCase(food.description),
    brand: food.brandOwner || food.brandName || undefined,
    servingLabel: hasServing ? `${food.servingSize} ${food.servingSizeUnit}` : "100 g",
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
  };
}

/** DEMO_KEY works out of the box (no signup) but caps out at 30 requests/hour, 50/day per IP -- fine for
 * trying this out, but swap in a real free key (instant, no approval -- api.data.gov/signup) via
 * VITE_USDA_API_KEY once this is getting real use. */
const API_KEY = import.meta.env.VITE_USDA_API_KEY || "DEMO_KEY";

export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    query,
    pageSize: "25",
    api_key: API_KEY,
    dataType: "Branded,Foundation,SR Legacy",
  });
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`);
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
  const json = await res.json();
  const foods = (json.foods ?? []) as UsdaFood[];
  const seen = new Set<string>();
  const results: FoodItem[] = [];
  for (const f of foods) {
    const item = normalizeUsdaFood(f);
    if (!item) continue;
    const key = `${item.name}|${item.brand ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}
