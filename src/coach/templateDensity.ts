import { libraryExercises } from "./exerciseLibrary";
import type { TemplateSpec } from "./womensTemplates";

/** Bringing every template up to the number of exercises a session should actually hold.
 *
 * Measured against Jack's own figures, which are already in the codebase as EXERCISES_PER_SESSION in
 * sessionStructure.ts -- derived from his ten clients' programs plus his own 6x:
 *
 *   | days/week | exercises/session |
 *   |---|---|
 *   | 2 | 10 |
 *   | 3 |  8 |
 *   | 4 |  7 |
 *   | 5 |  6 |
 *   | 6 |  6 |
 *
 * Forty-five of the sixty-nine templates sat one to three exercises a day under that. The six-day ones
 * matched, which is why the six-day glute split read correctly when he looked at it.
 *
 * ## Why this is code and not four hundred hand-written lines
 *
 * The fix is not "add exercises to the end of the day". Look at what the thin days actually are:
 *
 *   Back Width:  Back x2 > Biceps x1 > Glutes x1 > Calves x1
 *
 * Nothing is missing a muscle. What is missing is the second and third exercise INSIDE the back block --
 * which is the whole of G106/G124, that an emphasised muscle takes consecutive slots. Appending to the end
 * of the day would hit the count and destroy the ordering that makes these read like his.
 *
 * So the operation is: find the blocks that already exist, and deepen them in place. That is a rule, and a
 * rule belongs in one reviewable function rather than repeated by hand across forty-five templates where it
 * would drift.
 *
 * ## The rules it follows
 *
 * - **Deepen, never append.** A new exercise goes immediately after the last member of the block it joins,
 *   so muscles stay contiguous and no new muscle appears at the end of a day.
 * - **The leading block first.** The day opens on the emphasised muscle (G105), so that is the block that
 *   earns the extra work; the rest get theirs in order after it.
 * - **Never deepen the divider.** Calves, abs and obliques mark the seam between leg work and upper work
 *   (G102/G110). Two of them in a row is not a divider any more, so they are skipped.
 * - **Nothing is repeated inside a template.** A movement already used anywhere in the week is not a
 *   candidate, so the added work is genuinely new rather than the same exercise twice.
 * - **Equipment is respected.** A dumbbells-at-home template only ever draws from what you can do with
 *   dumbbells and a bench; a men's template never gains hip thrust work (G99).
 */

/** Jack's own figures. Kept as a copy rather than imported from sessionStructure so the templates do not
 * take a dependency on the generator, which is a separate subsystem with its own reasons to change. */
export const TARGET_PER_SESSION: Record<number, number> = { 2: 10, 3: 8, 4: 7, 5: 6, 6: 6 };

/** The small muscles that mark the leg/upper seam. Never deepened -- see G102/G110. */
const DIVIDERS = new Set(["Calves", "Abs", "Obliques"]);

/** What a home template may draw on: dumbbells, bodyweight, and a bench. */
const HOME = /^(Dumbbell|Incline Dumbbell|Single-Arm Dumbbell|Alternating Dumbbell|Goblet|Bulgarian|Walking Lunge|Reverse Lunge|Single-Leg|Bodyweight|Push-Up|Incline Push-Up|Pike Push-Up|Bench Dip|Plank|Side Plank|Mountain Climber|Bird Dog|Hammer Curl|Concentration Curl|Rear Delt Fly — Dumbbell|Arnold Press|Seated Dumbbell|Front Raise — Dumbbell|V-Up|Russian Twist|Heel Tap|Starfish|Glute Bridge — Bodyweight|Nordic)/;

/** G99: a man's program carries no hip thrust or glute bridge work. */
const MENS_BANNED = /hip thrust|glute bridge/i;

const BY_MUSCLE = new Map<string, string[]>();
for (const e of libraryExercises) {
  if (e.kind === "cardio") continue;
  const list = BY_MUSCLE.get(e.muscle) ?? [];
  list.push(e.name);
  BY_MUSCLE.set(e.muscle, list);
}

const MUSCLE_OF = new Map(libraryExercises.map((e) => [e.name, e.muscle]));

/** Contiguous runs of one muscle, in the order they appear. `start` is carried so a block's depth is known
 * without recounting, which is what decides where the next exercise goes. */
function blocksOf(slots: readonly (readonly [string, number, number])[]): { muscle: string; start: number; end: number }[] {
  const out: { muscle: string; start: number; end: number }[] = [];
  slots.forEach((slot, i) => {
    const muscle = MUSCLE_OF.get(slot[0]) ?? "";
    const last = out[out.length - 1];
    if (last && last.muscle === muscle) last.end = i;
    else out.push({ muscle, start: i, end: i });
  });
  return out;
}

export function deepen(spec: TemplateSpec): TemplateSpec {
  const target = TARGET_PER_SESSION[spec.days.length] ?? 6;
  const used = new Set(spec.days.flatMap((d) => d.slots.map((s) => s[0])));
  const home = spec.category === "dumbbell-home";

  const days = spec.days.map((day) => {
    const slots = day.slots.map((s) => [...s] as [string, number, number]);
    let guard = 0;

    while (slots.length < target && guard++ < 20) {
      // ONE insertion per pass, then recompute. A splice shifts every index after it, so inserting into
      // several blocks from positions computed before those splices puts the later additions in the wrong
      // place -- the second one lands after the first addition instead of inside the original run. That
      // turned "Side delts x2" into "Side delts > Rear delts > Side delts" across seventeen days, which is
      // precisely the interleaving G106/G124 forbids. Recomputing each pass costs nothing here and is the
      // only version of this that cannot drift out of order.
      const blocks = blocksOf(slots)
        .filter((b) => !DIVIDERS.has(b.muscle))
        .map((b) => ({
          ...b,
          size: b.end - b.start + 1,
          pool: (BY_MUSCLE.get(b.muscle) ?? []).filter(
            (name) =>
              !used.has(name) &&
              (!home || HOME.test(name)) &&
              (spec.sex !== "men" || !MENS_BANNED.test(name)),
          ),
        }))
        .filter((b) => b.pool.length > 0);

      // No muscle in this day has an unused exercise left. Stop rather than loop: a day that cannot reach
      // the figure honestly is better than one padded with repeats.
      if (!blocks.length) break;

      // Depth goes to the leading block first, since the day opens on the emphasised muscle (G105), but no
      // single muscle runs deeper than three before the next one earns its second exercise.
      const choice = blocks.find((b) => b.size < 3) ?? blocks[0];
      const pick = choice.pool[0];
      // Sets and reps follow the block's existing work rather than being invented: the added exercise is
      // more of the same job, so it gets the same prescription, one set lighter and a little higher in reps.
      const neighbour = slots[choice.end];
      slots.splice(choice.end + 1, 0, [pick, Math.max(2, neighbour[1] - 1), neighbour[2] + 2]);
      used.add(pick);
    }

    return { name: day.name, slots: slots.map((s) => [s[0], s[1], s[2]] as const) };
  });

  return { ...spec, days };
}

export function deepenAll(specs: readonly TemplateSpec[]): TemplateSpec[] {
  return specs.map(deepen);
}
