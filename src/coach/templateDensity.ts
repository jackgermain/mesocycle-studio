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

/** G9/G131: exercises the doctrine says are never prescribed, to anyone.
 *
 * This list existed only as prose in exercises-v1.md, and the pool below was built from the entire library
 * without consulting it -- so the density pass cheerfully inserted 61 days of decline pressing across 53
 * templates, plus preacher curls, sissy squats and ab wheel rollouts. Jack, finding one of them in a
 * generated day: "never use decline barbell bench press. We're not going to use that exercise at all."
 *
 * The two decline presses are gone from the library entirely, which is the stronger fix. These are the
 * denylisted movements that remain catalogue entries because a coach may still write them by hand. */
const DENYLISTED = new Set([
  "Rack Pull",
  "Ab Wheel Rollout",
  "Sissy Squat",
  "Preacher Curl — Barbell",
  "Preacher Curl Machine",
]);

/* Flies and the pec deck are deliberately NOT filtered here.
 *
 * The doctrine forbids them from OPENING a session -- *"I would never, in any cases, do either one of these
 * exercises first. Ever."* -- and an earlier version of this file excluded them from the pool outright to
 * enforce that. That was wrong in a way worth recording: `slots.splice(choice.end + 1, ...)` inserts at
 * index 1 at the earliest, so this pass structurally cannot create a slot-1 exercise. Filtering them here
 * enforced nothing and merely stripped every fly from the accessory pool of all 125 templates, when the
 * same doctrine puts the cable fly at "3rd or last" -- exactly the slot this pass fills.
 *
 * The rule belongs where a session's FIRST slot is authored, and is asserted in templateDoctrine.test.mts. */

/** Movements that are session OPENERS, never accessory filler. Everything this pass inserts lands at slot 2
 * or later by construction, so anything here simply may not be inserted.
 *
 * - **Barbell bench press (G128)**: past slot 2 the slot is an accessory slot, and the right occupant is a
 *   machine press or a fly. *"don't have barbell bench press third like that."*
 * - **Front squat (G130)**: this is where the front-squat-beside-back-squat days came from. The Legs A spec
 *   is back squat, leg extension, leg curl, calf raise -- the front squat was INSERTED third, which is
 *   exactly what he ruled out: *"don't have a front squat ever like that."* Blocking the front squat alone
 *   left the mirror case standing: two days open on an AUTHORED front squat and had the back squat inserted
 *   beside it. See SQUAT_PATTERN below -- the real rule is one barbell squat a day, either direction.
 * - **Pull-up and chin-up (G129)**: a vertical pull done at bodyweight is the hardest pull in the session
 *   and belongs before the pulldown, not spliced in after it. Inserting one is what produced 55 days with
 *   the pulldown first. */
const NEVER_INSERTED = /barbell bench press|front squat|\bpull-?up|\bchin-?up/i;

/** G130: one barbell squat pattern per session, in either direction. Checked against the day being built
 * rather than as a fixed name, because the violation is a PAIR -- a back squat is perfectly fine on its own
 * and only wrong once the day already holds a front squat, or the reverse. */
const SQUAT_PATTERN = /back squat|front squat/i;

/** G132: no template slot opens above three sets. Four is a progression step later in a block, not a
 * starting prescription. Jack: "anything that would be four sets, let's drop it to three." */
export const MAX_TEMPLATE_SETS = 3;

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
    // Recomputed per pass below, not captured once: an insertion can itself be a squat pattern.
    const hasSquat = () => slots.some((s) => SQUAT_PATTERN.test(s[0]));

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
              (spec.sex !== "men" || !MENS_BANNED.test(name)) &&
              // The doctrine's own denylist, which this pool ignored until it had inserted 61 days of
              // decline pressing. See DENYLISTED above.
              !DENYLISTED.has(name) &&
              !NEVER_INSERTED.test(name) &&
              // G130, the mirror case: never add a second barbell squat to a day that already has one.
              !(hasSquat() && SQUAT_PATTERN.test(name)),
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
      // G132 caps the inserted work at three sets as well as the authored work. Without the clamp an
      // insertion beside a 4-set opener inherited 3 and one beside a 5-set opener inherited 4.
      slots.splice(choice.end + 1, 0, [pick, Math.min(MAX_TEMPLATE_SETS, Math.max(2, neighbour[1] - 1)), neighbour[2] + 2]);
      used.add(pick);
    }

    return { name: day.name, slots: slots.map((s) => [s[0], s[1], s[2]] as const) };
  });

  return { ...spec, days };
}

export function deepenAll(specs: readonly TemplateSpec[]): TemplateSpec[] {
  return specs.map(deepen);
}
