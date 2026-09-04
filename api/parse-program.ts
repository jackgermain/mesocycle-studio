/**
 * Turns a photo, screenshot or PDF of a training program -- plus whatever the coach asks for in plain
 * English -- into the same DraftDay[] the spreadsheet importer produces.
 *
 * This exists as a serverless function for one reason: the Anthropic key cannot live in the app. Anything
 * in the Vite bundle is public, so a client-side call would hand the key to anyone who opened devtools and
 * let them spend against it. The browser talks to this endpoint; only this endpoint talks to Anthropic.
 *
 * Deliberately dependency-free -- plain fetch to both Supabase and Anthropic -- because this project has
 * no npm registry access to install SDKs (see the SheetJS note in src/coach/csvProgram.ts).
 *
 * Env (set in Vercel, server-side only -- no VITE_ prefix on the key so it can never be bundled):
 *   ANTHROPIC_API_KEY               required
 *   VITE_SUPABASE_URL               reused from the client config to verify callers
 *   VITE_SUPABASE_PUBLISHABLE_KEY   ditto
 */

export const config = {
  // Reading a multi-page PDF and reasoning about a whole mesocycle takes well past the 10s default.
  maxDuration: 60,
};

const MODEL = "claude-sonnet-5";

const MUSCLES = [
  "Abs", "Back", "Biceps", "Calves", "Chest", "Forearms", "Front delts", "Side delts", "Rear delts",
  "Full body", "Glutes", "Hamstrings", "Adductors", "Obliques", "Quads", "Traps", "Triceps",
];

const PROGRAM_TOOL = {
  name: "emit_program",
  description: "Return the training program as structured data.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "A short name for the program, from the document if it has one." },
      weeks: { type: "integer", description: "How many weeks the program runs. Default 4 if unstated." },
      days: {
        type: "array",
        description: "One entry per distinct training day in a single week, in the order they're trained.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: 'What this day is called, e.g. "Upper A", "Push", "Legs".' },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  muscle: { type: "string", enum: MUSCLES, description: "The primary mover." },
                  sets: { type: "integer" },
                  reps: { type: "integer" },
                  load: { type: "number", description: "Value in whatever unit loadMode says." },
                  loadMode: { type: "string", enum: ["lb", "pct1rm", "rpe", "rir"] },
                },
                required: ["name", "muscle"],
              },
            },
          },
          required: ["name", "exercises"],
        },
      },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "Anything you had to assume, guess, or couldn't read. Be specific and honest.",
      },
    },
    required: ["days"],
  },
};

const SYSTEM = `You read training programs out of photos, screenshots and PDFs and return them as structured data for a hypertrophy training app.

Rules:
- Return one entry in "days" per distinct training day in a SINGLE week. The app repeats that week for the requested number of weeks, so never repeat a week yourself.
- If the user asks for a day to be trained more than once a week, emit it that many times as separate days (e.g. a 2-day plan asked to run 4x/week becomes four days: Upper, Lower, Upper, Lower). Give repeats distinct names like "Upper A" and "Upper B".
- Read the actual numbers off the source. Do not invent sets, reps or loads that are not there -- leave the field out instead, and the app fills in its own default.
- "load" is only a weight when loadMode is "lb". Use "pct1rm" for percentages, "rpe" or "rir" when the source prescribes effort rather than weight.
- Every exercise needs a primary muscle from the allowed list. Pick the closest one.
- Keep the source's exercise names as written. Do not rename a movement to something you think is better.
- Put anything you guessed, could not read, or had to interpret into "notes". A coach is going to check your work, and a wrong number is worse than a flagged one. If the image is unreadable, return an empty days list and say why in notes.`;

async function readJson(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

/** Only signed-in coaches and self-directed friend/family accounts may spend against the API key. A fully
 * prescribed client has no business importing a program -- their coach writes it -- and leaving the
 * endpoint open would let anyone with the URL run up a bill. Checked here rather than only in the UI,
 * because a hidden button is not access control. */
async function callerRole(token: string): Promise<string | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!me.ok) return null;
  const user = await me.json();
  if (!user?.id) return null;

  // Read through PostgREST as the caller, so RLS decides what they can see rather than this function.
  const row = await fetch(`${url}/rest/v1/accounts?id=eq.${user.id}&select=role,active`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!row.ok) return null;
  const rows = await row.json();
  const account = Array.isArray(rows) ? rows[0] : null;
  if (!account || account.active === false) return null;
  return account.role ?? null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Names only, never values. Setting this up by hand goes wrong in four ways that look identical from
    // the outside -- a typo in the name, a stray space, saved to Preview but not Production, or saved but
    // never redeployed -- and reporting which similarly-named variables *are* visible tells them apart
    // immediately. A variable name is not a secret; the value never leaves the server.
    const seen = Object.keys(process.env).filter((k) => /ANTHROPIC|CLAUDE/i.test(k));
    res.status(500).json({
      error: "This app's AI import isn't configured yet — ANTHROPIC_API_KEY is missing.",
      diagnostic: {
        environment: process.env.VERCEL_ENV ?? "unknown",
        similarNamesVisible: seen,
        supabaseVarsVisible: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter((k) => !!process.env[k]),
      },
    });
    return;
  }

  const token = (req.headers?.authorization ?? "").replace(/^Bearer /i, "");
  if (!token) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const role = await callerRole(token);
  if (role !== "coach" && role !== "friend") {
    res.status(403).json({ error: "Importing a program with AI is for coaches and friends-and-family accounts." });
    return;
  }

  let body: any;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: "Couldn't read that request." });
    return;
  }

  const files: { mediaType: string; data: string }[] = Array.isArray(body.files) ? body.files : [];
  const instructions: string = typeof body.instructions === "string" ? body.instructions : "";
  if (files.length === 0) {
    res.status(400).json({ error: "Attach a photo or PDF of the program." });
    return;
  }

  const content: any[] = files.map((f) =>
    f.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }
      : { type: "image", source: { type: "base64", media_type: f.mediaType, data: f.data } },
  );
  content.push({
    type: "text",
    text: instructions.trim()
      ? `Turn this into a program. What I want:\n\n${instructions.trim()}`
      : "Turn this into a program exactly as written, one entry per training day in a single week.",
  });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        tools: [PROGRAM_TOOL],
        tool_choice: { type: "tool", name: "emit_program" },
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    res.status(502).json({ error: "Couldn't reach the AI service. Try again." });
    return;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Anthropic error", response.status, detail.slice(0, 500));

    // Billing and auth failures have nothing to do with the photo, and telling someone to try a clearer
    // one sends them chasing a problem that isn't there. Say what actually needs doing.
    let error = "The AI service couldn't read that. Try a clearer photo, or a different file.";
    if (/credit balance|insufficient|billing/i.test(detail)) {
      error = "The Anthropic account is out of credits — top it up at console.anthropic.com and try again.";
    } else if (response.status === 401 || response.status === 403) {
      error = "The AI service rejected this app's API key — it may have been revoked or mistyped.";
    } else if (response.status === 429) {
      error = "The AI service is rate limited right now — give it a minute.";
    } else if (/model/i.test(detail) && response.status === 404) {
      error = "This app is configured for a model the account can't use. That's a setup problem, not your file.";
    }
    res.status(502).json({ error });
    return;
  }

  const payload = await response.json();
  const block = (payload.content ?? []).find((b: any) => b.type === "tool_use" && b.name === "emit_program");
  if (!block) {
    res.status(502).json({ error: "The AI didn't return a program. Try a clearer photo." });
    return;
  }

  res.status(200).json(block.input);
}
