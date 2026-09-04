/**
 * Turns a coach's plain-English instruction ("make every exercise one set") into a list of edit
 * operations against the program open in the builder.
 *
 * The model never returns a program. It returns operations, which the browser applies itself and shows as
 * a diff before anything is saved -- see src/coach/programAiEdit.ts for why that matters. This endpoint's
 * job is only translation: English in, a checkable list of changes out.
 *
 * Same key handling, auth and role rules as api/parse-program.ts.
 */

export const config = { maxDuration: 60 };

const MODEL = "claude-sonnet-5";

const TARGET = {
  type: "array",
  items: { type: "string" },
  description: "Exercise ids this applies to. List every id you mean; there is no 'all' shorthand.",
};

const EDIT_TOOL = {
  name: "emit_edits",
  description: "Return the edits to make to the program.",
  input_schema: {
    type: "object",
    properties: {
      ops: {
        type: "array",
        items: {
          type: "object",
          properties: {
            op: {
              type: "string",
              enum: [
                "set_set_count",
                "set_reps",
                "adjust_reps",
                "set_load",
                "adjust_load",
                "set_rest",
                "rename_exercise",
                "remove_exercise",
                "rename_day",
                "swap_exercise",
                "add_exercise",
                "reorder_day",
                "set_warmup_count",
                "set_reps_per_set",
              ],
            },
            exerciseIds: TARGET,
            dayId: { type: "string", description: "For rename_day only." },
            count: { type: "integer", description: "For set_set_count: how many working sets." },
            reps: { type: "integer", description: "For set_reps." },
            delta: { type: "number", description: "For adjust_reps and adjust_load. Negative to decrease." },
            value: { type: "number", description: "For set_load, in the program's load unit." },
            seconds: { type: "integer", description: "For set_rest." },
            name: { type: "string", description: "For rename_exercise, rename_day, swap_exercise and add_exercise." },
            dayIds: { type: "array", items: { type: "string" }, description: "For add_exercise: which days to add it to." },
            muscle: {
              type: "string",
              enum: [
                "Abs", "Back", "Biceps", "Calves", "Chest", "Forearms", "Front delts", "Side delts",
                "Rear delts", "Full body", "Glutes", "Hamstrings", "Adductors", "Obliques", "Quads",
                "Traps", "Triceps",
              ],
              description: "For add_exercise (required) and swap_exercise (when the muscle changes).",
            },
            repsPerSet: { type: "array", items: { type: "integer" }, description: "For set_reps_per_set, e.g. [12,10,8]." },
            load: { type: "number", description: "For add_exercise: starting load." },
            sets: { type: "integer", description: "For add_exercise: how many sets." },
          },
          required: ["op"],
        },
      },
      summary: { type: "string", description: "One sentence describing what you changed." },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "Anything you could not do, or had to interpret. Be specific and honest.",
      },
    },
    required: ["ops"],
  },
};

const SYSTEM = `You edit strength training programs on behalf of a coach, by returning operations against the program you're shown.

Rules:
- Only use the operations available. If the coach asks for something outside them, do what you can and say plainly in "notes" what you couldn't do. Never pretend an unsupported change was made.
- What the operations cover: how many sets, reps (uniform or per-set like 12/10/8), load, rest, warm-up count, renaming, removing, swapping one movement for another, adding a new movement to a day, and reordering a day. Between them that covers most of what a coach asks for. Resolve whatever the coach refers to yourself -- "the calf work", "the first exercise", "everything on Tuesday", "the pressing" -- using the names, muscles, day names and order you can see.
- swap_exercise keeps the sets and reps and changes the movement. remove_exercise plus add_exercise is a different thing and loses the prescription; prefer a swap when they say "swap", "replace" or "change X to Y".
- Target exercises by listing their ids explicitly. "Every exercise" means listing all of them.
- You will be shown one of two shapes, and it changes what's possible:
  (a) A "days" list with no week numbers. That is ONE WEEK's template, repeated for the whole program, so week 2 cannot differ from week 1. If asked for a week-over-week change, return no ops for that part and say so in notes.
  (b) A "weeks" list, each with a week number and its own days. Here every week is real and separately editable. "Next week" means the week after "currentWeek". "This week" means currentWeek itself. Target only the exercise ids inside the weeks you mean.
- In shape (b), "loggedSets" tells you how many sets of an exercise are already done. Those can't be changed, and a set count can't go below them. Days already finished aren't shown at all.
- "load" is in the program's own unit, which is stated in the input. It is not always pounds.
- Rest is in seconds.
- Be conservative. A coach is reviewing this, and a change they didn't ask for costs them more time than one you skipped and flagged.`;

async function readJson(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function callerRole(token: string): Promise<string | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!me.ok) return null;
  const user = await me.json();
  if (!user?.id) return null;

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

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    res.status(500).json({ error: "This app's AI editing isn't configured yet — ANTHROPIC_API_KEY is missing." });
    return;
  }

  const token = (req.headers?.authorization ?? "").replace(/^Bearer /i, "");
  if (!token) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const role = await callerRole(token);
  if (role !== "coach" && role !== "friend") {
    res.status(403).json({ error: "Editing a program with AI is for coaches and friends-and-family accounts." });
    return;
  }

  let body: any;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: "Couldn't read that request." });
    return;
  }

  const instruction: string = typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    res.status(400).json({ error: "Say what you'd like changed." });
    return;
  }
  if (!body.program) {
    res.status(400).json({ error: "No program was sent." });
    return;
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        tools: [EDIT_TOOL],
        tool_choice: { type: "tool", name: "emit_edits" },
        messages: [
          {
            role: "user",
            content: `Here is the program:\n\n${JSON.stringify(body.program, null, 1)}\n\nWhat I want changed:\n\n${instruction}`,
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
    console.error("Anthropic error", response.status, detail.slice(0, 500));
    let error = "The AI service couldn't handle that. Try rewording it.";
    if (/credit balance|insufficient|billing/i.test(detail)) {
      error = "The Anthropic account is out of credits — top it up at console.anthropic.com and try again.";
    } else if (response.status === 401 || response.status === 403) {
      error = "The AI service rejected this app's API key.";
    } else if (response.status === 429) {
      error = "The AI service is rate limited right now — give it a minute.";
    }
    res.status(502).json({ error });
    return;
  }

  const payload = await response.json();
  const block = (payload.content ?? []).find((b: any) => b.type === "tool_use" && b.name === "emit_edits");
  if (!block) {
    res.status(502).json({ error: "The AI didn't return any edits. Try rewording it." });
    return;
  }

  res.status(200).json(block.input);
}
