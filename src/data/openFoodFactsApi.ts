import type { FoodItem } from "./foodDatabase";

/** Open Food Facts' server doesn't send CORS headers permitting a plain cross-origin fetch() from a
 * browser, so a normal request just fails -- their search endpoint still supports the old-school JSONP
 * pattern (a `callback` param wrapping the response in a function call, loaded via a <script> tag, which
 * isn't subject to CORS) for exactly this case. */
function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__off_cb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
      clearTimeout(timer);
    };
    (window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Open Food Facts request failed"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Open Food Facts request timed out"));
    }, timeoutMs);
    script.src = `${url}&callback=${cbName}`;
    document.head.appendChild(script);
  });
}

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
}
interface OffSearchResponse {
  products?: OffProduct[];
}

/** Same physical constraint as the USDA source: protein + carbs + fat can never outweigh the serving
 * itself. Open Food Facts is crowdsourced (anyone can submit a product's label), so this matters just as
 * much here. */
function isPhysicallyPlausible(grams: number, protein: number, carbs: number, fat: number): boolean {
  return protein + carbs + fat <= grams * 1.05;
}

function normalizeOffProduct(p: OffProduct): FoodItem | null {
  const name = p.product_name?.trim();
  const n = p.nutriments ?? {};
  const kcal = n["energy-kcal_serving"] ?? n["energy-kcal_100g"];
  if (!name || !kcal) return null;
  const usingServing = n["energy-kcal_serving"] != null;
  const servingLabel = usingServing && p.serving_size ? p.serving_size : "100 g";
  const suffix = usingServing ? "_serving" : "_100g";
  const grams = usingServing && p.serving_size ? parseFloat(p.serving_size) || 100 : 100;
  const protein = Math.round((n[`proteins${suffix}`] ?? 0) * 10) / 10;
  const carbs = Math.round((n[`carbohydrates${suffix}`] ?? 0) * 10) / 10;
  const fat = Math.round((n[`fat${suffix}`] ?? 0) * 10) / 10;
  if (!isPhysicallyPlausible(grams, protein, carbs, fat)) return null;
  return {
    id: `off-${p.code}`,
    name,
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    servingLabel,
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
  };
}

export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,serving_size,nutriments",
    cc: "us",
    lc: "en",
  });
  const data = await jsonp<OffSearchResponse>(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
  const seen = new Set<string>();
  const results: FoodItem[] = [];
  for (const p of data.products ?? []) {
    const item = normalizeOffProduct(p);
    if (!item) continue;
    const key = `${item.name}|${item.brand ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}
