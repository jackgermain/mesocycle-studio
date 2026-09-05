import type { CoachClient, CoachProgram } from "./types";

/** Something the AI button can act on when nothing is open on screen: one of your templates or drafts, or
 * one client's live block. */
export interface AiTarget {
  kind: "template" | "client";
  id: string;
  name: string;
  detail: string;
  /** Clients only — the account whose client_state holds the live program. */
  accountId?: string;
}

export function listTargets(programs: CoachProgram[], clients: CoachClient[]): AiTarget[] {
  return [
    ...clients
      .filter((c) => c.accountId && c.status !== "unassigned")
      .map((c) => ({
        kind: "client" as const,
        id: c.id,
        name: c.name,
        detail: `${c.programName} · wk ${c.week}`,
        accountId: c.accountId,
      })),
    ...programs.map((p) => ({
      kind: "template" as const,
      id: p.id,
      name: p.name,
      detail: p.isTemplate ? (p.visibility === "public" ? "Public template" : "Template") : "Draft",
    })),
  ];
}

const STOP = new Set([
  "the", "and", "for", "add", "reps", "rep", "set", "sets", "next", "week", "weeks", "this", "make",
  "every", "all", "his", "her", "their", "them", "program", "block", "lbs", "lb", "take", "down",
  "swap", "change", "drop", "remove", "give", "put", "with", "from", "into", "to", "of", "on", "in",
]);

/** Works out who or what an instruction is about, from the names alone.
 *
 * Deliberately not an extra AI call. It's a name match against a short list the coach wrote themselves,
 * so it's a string problem, not a language one -- and doing it locally means no second round trip, no
 * extra cost, and no second thing that can fail. When it isn't sure it says so and asks, which is the
 * right outcome for "add 5 reps next week" with four clients on the roster. */
export function resolveTarget(instruction: string, targets: AiTarget[]): { match: AiTarget | null; ambiguous: AiTarget[] } {
  // Only one thing on the whole roster? Then that's what it's about, whatever they called it.
  if (targets.length === 1) return { match: targets[0], ambiguous: [] };

  const norm = (v: string) => v.toLowerCase().replace(/['\u2019]s\b/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  // Possessives are how a coach actually refers to someone ("Jay's", "Gran's"), so they're stripped
  // rather than failing on the apostrophe. Padded with spaces so matches are whole words only --
  // "row" inside "tomorrow" is not a reference to a Row.
  const text = ` ${norm(instruction)} `;

  // Pass one: the whole name, said as written. Beats word scoring outright, and catches names made
  // entirely of common words -- "My Program" has nothing distinctive word by word.
  const phraseHits = targets.filter((t) => {
    const p = norm(t.name);
    return p.length > 0 && text.includes(` ${p} `);
  });
  if (phraseHits.length === 1) return { match: phraseHits[0], ambiguous: [] };
  // Two names both said out loud is a genuinely ambiguous instruction, not a close call to be broken by
  // whichever is longer. Editing the wrong person's training is the one outcome worth an extra tap.
  if (phraseHits.length > 1) return { match: null, ambiguous: phraseHits };

  // Pass two: partial, word-by-word. "the tai chi program" should still find the Tai Chi template.
  const scored = targets
    .map((t) => {
      const words = norm(t.name)
        .split(" ")
        .filter((w) => w.length >= 3 && !STOP.has(w));
      if (words.length === 0) return { t, score: 0 };
      const hits = words.filter((w) => text.includes(` ${w} `)).length;
      // A client beats a template on a tie: "add 5 reps to Jay" is far more likely about the person than
      // about a program whose name happens to contain the same word.
      return { t, score: hits === words.length ? hits * 2 + (t.kind === "client" ? 1 : 0) : hits };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { match: null, ambiguous: [] };
  if (scored.length === 1 || scored[0].score > scored[1].score) return { match: scored[0].t, ambiguous: [] };
  return { match: null, ambiguous: scored.filter((x) => x.score === scored[0].score).map((x) => x.t) };
}
