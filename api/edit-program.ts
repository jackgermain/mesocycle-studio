/**
 * Turns a coach's plain-English instruction into a rewritten program.
 *
 * The model returns the program itself, not a list of permitted operations. An earlier version
 * constrained it to a fixed vocabulary so it couldn't mangle anything; that made every new kind of
 * request wait on a new operation being added, which is the wrong tradeoff. What keeps this safe is the
 * browser re-imposing the rules the model isn't allowed to break and then diffing real before against
 * real after, so anything it changed -- asked for or not -- is visible before it saves.
 *
 * Same key handling, auth and role rules as api/parse-program.ts.
 */

export const config = { maxDuration: 60 };

const MODEL = "claude-sonnet-5";

const MUSCLES = [
  "Abs", "Back", "Biceps", "Calves", "Chest", "Forearms", "Front delts", "Side delts", "Rear delts",
  "Full body", "Glutes", "Hamstrings", "Adductors", "Obliques", "Quads", "Traps", "Triceps",
];

const SET = {
  type: "object",
  properties: {
    reps: { type: "integer" },
    load: { type: "number", description: "In the program's own load unit. Omit to leave as it was; a bodyweight set has no load." },
    restSec: { type: "integer" },
    warmup: { type: "boolean" },
  },
};

const EXERCISE = {
  type: "object",
  properties: {
    exerciseId: {
      type: "string",
      description: "Copy the id exactly for an exercise that already exists, even if you changed it. Omit only for a brand new one.",
    },
    name: { type: "string" },
    muscle: { type: "string", enum: MUSCLES },
    sets: { type: "array", items: SET },
  },
  required: ["name", "muscle", "sets"],
};

const DAY = {
  type: "object",
  properties: {
    dayId: { type: "string", description: "Copy the id exactly. Omit only for a brand new day." },
    name: { type: "string" },
    exercises: { type: "array", items: EXERCISE },
  },
  required: ["name", "exercises"],
};

const EDIT_TOOL = {
  name: "emit_program",
  description: "Return the whole program after your changes.",
  input_schema: {
    type: "object",
    properties: {
      days: { type: "array", items: DAY, description: "Use this when you were given a 'days' list (one week's template)." },
      weeks: {
        type: "array",
        description: "Use this when you were given a 'weeks' list. Return every week you were shown.",
        items: {
          type: "object",
          properties: { week: { type: "integer" }, days: { type: "array", items: DAY } },
          required: ["week", "days"],
        },
      },
      summary: { type: "string", description: "One sentence describing what you changed." },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "Anything you couldn't do, had to interpret, or judged. Be specific and honest.",
      },
    },
  },
};

const SYSTEM = `You edit strength training programs on behalf of a coach. You are given a program and an instruction, and you return the whole program back with the instruction carried out.

Rules:
- Return EVERY day and EVERY exercise you were shown, not only the ones you changed. Anything you leave out is treated as deleted.
- Copy dayId and exerciseId across exactly, including for things you changed. That is how an edit is told apart from a deletion plus an addition. Omit an id only for something genuinely new.
- Change only what was asked for. The coach sees a line-by-line diff of everything you touched, so an unrequested "improvement" reads as a mistake and costs them time.
- Resolve what the coach refers to yourself -- "the calf work", "the first exercise", "everything on Tuesday", "the pressing" -- from the names, muscles, day names and order you can see.
- You will be given one of two shapes:
  (a) "days" with no week numbers: ONE WEEK's template, repeated for the whole program. Week 2 cannot differ from week 1. If asked for a week-over-week change, say so in notes and leave it alone. Return "days".
  (b) "weeks", each with its own days: every week is real and separately editable. "Next week" means the week after currentWeek. Return "weeks", including every week you were shown.
- In shape (b), sets marked alreadyLogged are training that has already happened. Leave them exactly as they are, in place, and never reduce an exercise below them. The app enforces this regardless, so proposing otherwise just produces a change that silently doesn't land.
- Load is in the program's own unit, which is not always pounds. Rest is in seconds.
- If part of the request is impossible or ambiguous, do the part you're sure of and say the rest in notes. Never pretend.`;

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
        // The whole program comes back, not a diff, so this has to cover a multi-week block in full.
        max_tokens: 32000,
        system: SYSTEM,
        tools: [EDIT_TOOL],
        tool_choice: { type: "tool", name: "emit_program" },
        messages: [
          {
            role: "user",
            content: `Here is the program:\n\n${JSON.stringify(body.program, null, 1)}${typeof body.context === "string" && body.context.trim() ? `\n\nWhat the coach is currently looking at:\n\n${body.context.trim()}` : ""}\n\nWhat I want changed:\n\n${instruction}`,
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
  const truncated = payload.stop_reason === "max_tokens";
  const block = (payload.content ?? []).find((b: any) => b.type === "tool_use" && b.name === "emit_program");

  if (!block || truncated) {
    console.error("edit-program produced nothing usable", { stop_reason: payload.stop_reason, hasBlock: !!block });
    res.status(502).json({
      error: truncated
        ? "That program is too big to rewrite in one go. Try asking for one week or one day at a time."
        : "The AI didn't return a program. Try rewording it.",
    });
    return;
  }

  res.status(200).json(block.input);
}
