/**
 * Reads a photographed nutrition label into a single food the app can log.
 *
 * Same reason for existing as parse-program.ts: the Anthropic key cannot live in the app. Anything in the
 * Vite bundle is public, so a client-side call would hand the key to anyone who opened devtools.
 *
 * **The access gate here is deliberately different from parse-program's, and the difference matters.**
 * That endpoint allows only `coach` and `friend`, because writing a program is a coach's job and a
 * prescribed client has no business importing one. Logging food is the opposite: every account eats,
 * including a fully prescribed client, so the gate is "signed in and not revoked" rather than a role test.
 * Copying the role check across would have quietly denied the feature to the accounts most likely to use it.
 *
 * Dependency-free plain fetch, like its neighbours -- this project has no npm registry access.
 *
 * Env (server-side only; no VITE_ prefix on the key so it can never be bundled):
 *   ANTHROPIC_API_KEY               required
 *   VITE_SUPABASE_URL               reused from the client config to verify callers
 *   VITE_SUPABASE_PUBLISHABLE_KEY   ditto
 */

export const config = {
  // One image and one small JSON object. Nothing like the multi-page PDFs parse-program has to sit through.
  maxDuration: 30,
};

const MODEL = "claude-sonnet-5";

const FOOD_TOOL = {
  name: "emit_food",
  description: "Return the nutrition facts from the label as one food.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "What the food is, as printed. e.g. \"Greek Yoghurt, plain\"." },
      brand: { type: "string", description: "The brand, if the packaging shows one. Leave out if not." },
      servingLabel: {
        type: "string",
        description:
          'The serving these numbers are for, exactly as the label states it, including the weight in brackets where given: "1 scoop (32g)", "100 g", "2 biscuits (25g)".',
      },
      kcal: { type: "number", description: "Calories per serving, in kcal." },
      protein: { type: "number", description: "Protein per serving, in grams." },
      carbs: { type: "number", description: "Total carbohydrate per serving, in grams." },
      fat: { type: "number", description: "Total fat per serving, in grams." },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "Anything guessed, converted, or unreadable. One short sentence each.",
      },
    },
    required: ["name", "servingLabel", "kcal", "protein", "carbs", "fat"],
  },
} as const;

const SYSTEM = `You read nutrition labels off photographs and return the numbers exactly as printed.

Rules that decide whether the result is usable:

- Report PER SERVING, not per 100g, whenever the label gives both. Most labels show two columns; the
  serving column is the one people log. Put the serving itself in servingLabel exactly as printed, keeping
  the gram weight in brackets when it is shown, because the app converts amounts using that weight.
- If the label ONLY gives per 100g, use that and set servingLabel to "100 g".
- Energy: return kcal. If the label shows only kJ, divide by 4.184 and say so in notes.
- "Total carbohydrate" is the carbs figure, not "net carbs" and not sugars alone. "Total fat" likewise.
- Round to at most one decimal place.
- Never invent a number. If a macro genuinely is not legible, say which one in notes rather than guessing;
  a wrong figure is worse than a missing one because it silently corrupts someone's daily total.
- If the photo is not a nutrition label at all, return notes explaining that and no food.`;

async function readJson(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

/** Signed in, and not revoked. See the note at the top: role is deliberately not checked here. */
async function callerIsActive(token: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;

  const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!me.ok) return false;
  const user = await me.json();
  if (!user?.id) return false;

  // Read through PostgREST as the caller, so RLS decides what they can see rather than this function.
  const row = await fetch(`${url}/rest/v1/accounts?id=eq.${user.id}&select=active`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!row.ok) return false;
  const rows = await row.json();
  const account = Array.isArray(rows) ? rows[0] : null;
  return !!account && account.active !== false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  // Trimmed for the same reason parse-program trims it: a key pasted out of a console very often arrives
  // with a trailing newline, and the API rejects that as invalid with no hint why.
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const seen = Object.keys(process.env).filter((k) => /ANTHROPIC|CLAUDE/i.test(k));
    res.status(500).json({
      error: "Label reading isn't configured yet — ANTHROPIC_API_KEY is missing.",
      diagnostic: { environment: process.env.VERCEL_ENV ?? "unknown", similarNamesVisible: seen },
    });
    return;
  }

  const token = (req.headers?.authorization ?? "").replace(/^Bearer /i, "");
  if (!token) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  if (!(await callerIsActive(token))) {
    res.status(403).json({ error: "That account can't read labels." });
    return;
  }

  let body: any;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: "Couldn't read that request." });
    return;
  }

  const image = body?.image;
  if (!image?.data || !image?.mediaType) {
    res.status(400).json({ error: "Take a photo of the label first." });
    return;
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        tools: [FOOD_TOOL],
        tool_choice: { type: "tool", name: "emit_food" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
              { type: "text", text: "Read this nutrition label." },
            ],
          },
        ],
      }),
    });
  } catch {
    res.status(502).json({ error: "Couldn't reach the AI service. Try again." });
    return;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("read-label error", response.status, detail.slice(0, 500));

    // A billing or key problem has nothing to do with the photo, and telling someone to retake it sends
    // them chasing a fault that isn't theirs.
    let error = "Couldn't read that label. Try again with the label flat and in focus.";
    if (/credit balance|insufficient|billing/i.test(detail)) {
      error = "The Anthropic account is out of credits — top it up at console.anthropic.com.";
    } else if (response.status === 401 || response.status === 403) {
      error = "The AI service rejected this app's API key. That's a setup problem, not your photo.";
    } else if (response.status === 429) {
      error = "The AI service is rate limited right now — give it a minute.";
    }
    res.status(502).json({ error });
    return;
  }

  const payload = await response.json();
  const block = (payload.content ?? []).find((b: any) => b.type === "tool_use" && b.name === "emit_food");
  const food = block?.input;

  // Every macro must be a real number before this is worth showing. A label read that returns a name and
  // no figures would add an empty food to someone's day and look like it worked.
  const usable =
    food &&
    typeof food.name === "string" &&
    ["kcal", "protein", "carbs", "fat"].every((k) => typeof food[k] === "number" && Number.isFinite(food[k]));

  if (!usable) {
    res.status(502).json({
      error:
        food?.notes?.[0] ??
        "Couldn't read the numbers off that label. Get the nutrition panel square in frame, flat, and in focus.",
      diagnostic: `stop=${payload.stop_reason ?? "none"} block=${block ? "yes" : "no"}`,
    });
    return;
  }

  res.status(200).json(food);
}
