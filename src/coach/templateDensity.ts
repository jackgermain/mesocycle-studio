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

/** Movements that leave the spinal erectors resisting flexion for the whole set.
 *
 * Jack, on a day that had already run a hip thrust, a pull-through, a squat and an RDL before its row:
 * *"the amount of spine erector work already done in the session is very, very high. So this won't be very
 * high quality."* And on the same day's T-bar row: *"even more so than the seated cable row."*
 *
 * Erector load ACCUMULATES across a session in a way no per-exercise rule can see. Once a day is carrying
 * two of these, this pass stops adding more of them -- so a leg-heavy day gets a chest-supported row rather
 * than a T-bar, and stops collecting a third and fourth hinge. */
const LOADS_ERECTORS = /deadlift|romanian|good ?morning|back squat|front squat|pull-?through|hip thrust|back extension|hyperextension|bent-?over|pendlay|meadows|t-?bar|seated cable row/i;
const ERECTOR_BUDGET = 2;

/** G132: no template slot opens above three sets. Four is a progression step later in a block, not a
 * starting prescription. Jack: "anything that would be four sets, let's drop it to three." */
export const MAX_TEMPLATE_SETS = 3;

/** G136: the most exercises one muscle may get in a single session.
 *
 * Jack, on a quad day carrying a back squat, two leg presses, a leg extension and a hack squat: "remove
 * either the hack squat machine or the leg press. Just one of the two. This is a ridiculous amount of
 * volume for quads."
 *
 * The cap below USED to be soft and that is the whole bug. The selector read
 * `blocks.find((b) => b.size < 3) ?? blocks[0]`, so the moment every block reached three the fallback
 * dumped every remaining insertion onto the first one. It produced 157 muscle blocks with four or more
 * exercises in one session, and thirteen with SEVEN -- seventeen sets on a single muscle in a single day.
 *
 * Four, not three, because he asked for one of the two machines removed rather than both. A stricter three
 * would match the original comment's intent; that is his call. */
const MAX_PER_MUSCLE = 4;

/** Reps on an inserted exercise, ceiling.
 *
 * Each insertion took `neighbour reps + 2`, which compounds: 10 -> 12 -> 14 -> 16 -> 18 -> 20. That is
 * where the 2x17 and 2x19 slots came from, and 321 non-timed slots sat above 15 reps. The authored
 * templates top out at 15, and repRanges.ts reserves 20-30 "pretty much strictly for cluster sets, or
 * crazy forearm training, or calf raises" -- not for a leg press. */
const MAX_INSERTED_REPS = 15;

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
  // Reserved names count as used: a template that swapped an exercise out must not have it re-inserted
  // somewhere else. See TemplateDay.reserved.
  const used = new Set(spec.days.flatMap((d) => [...d.slots.map((s) => s[0]), ...(d.reserved ?? [])]));
  const home = spec.category === "dumbbell-home";

  /* G137: a muscle trained on the previous CALENDAR day takes strictly less today.
   *
   * Jack, on three templates running: "there's not enough time for hamstrings to heal from day one,
   * especially because it's day two, literally the next day" … "the volume is too much, two days in a row"
   * … "10 sets of glutes the day before, and then another seven sets — that's pretty crazy."
   *
   * This is the first rule here that spans two sessions. Everything else `deepen` enforces — the erector
   * budget, the squat-pattern ban, the four-per-muscle cap — is scoped to one day, which is exactly why the
   * generator could stack a muscle across adjacent days without any of them objecting.
   *
   * So the day loop is sequential rather than a `.map`: day N has to see day N-1's FINISHED slots, inserted
   * work included, not just what was authored into it.
   *
   * Adjacency is by calendar day, read off `dows`. A three-day template on Mon/Wed/Fri has no adjacent days
   * at all, which is why none of these complaints ever arrive from one.
   *
   * It caps rather than forbids, and the distinction is the whole rule. Excluding the muscle outright
   * empties the candidate pool on a four-day template — those run the two emphasised muscles as a,b,a,b on
   * Mon/Tue/Thu/Fri, so on days 2 and 4 every non-divider block would be blocked and the day would stall
   * three exercises short of its target. Measured before this was written: 193 insertions would have gone,
   * six from every four-day specialty.
   *
   * The cap is "no MORE than yesterday", not "strictly fewer", and that was measured rather than chosen.
   * Strictly fewer removed 85 exercises library-wide and pushed days under their exercise target from 105
   * to 172 of 524 — a third of the library falling short of Jack's own figures to achieve three removals he
   * had named. The looser cap still blocks all three: in each case the day already authors two of that
   * muscle against yesterday's two, so the insertion is refused either way. The extra strictness bought
   * nothing he asked for and cost eighty-five slots.
   *
   * Which is why G137 records the threshold as STILL TO RULE ON. "I would remove like seven of those for
   * sure, or like six or five" is a direction, not a figure, and this is the least destructive reading of
   * it that delivers everything he actually pointed at. */
  const days: { name: string; slots: readonly (readonly [string, number, number])[] }[] = [];
  spec.days.forEach((day, dayIndex) => {
    const yesterday = new Map<string, number>();
    if (dayIndex > 0 && spec.dows[dayIndex] === spec.dows[dayIndex - 1] + 1) {
      for (const s of days[dayIndex - 1].slots) {
        const m = MUSCLE_OF.get(s[0]) ?? "";
        yesterday.set(m, (yesterday.get(m) ?? 0) + 1);
      }
    }
    const slots = day.slots.map((s) => [...s] as [string, number, number]);
    let guard = 0;
    // Recomputed per pass below, not captured once: an insertion can itself be a squat pattern.
    const hasSquat = () => slots.some((s) => SQUAT_PATTERN.test(s[0]));
    // Likewise recomputed -- each insertion can add to the day's erector load.
    const erectorLoad = () => slots.filter((s) => LOADS_ERECTORS.test(s[0])).length;

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
              !(hasSquat() && SQUAT_PATTERN.test(name)) &&
              // G135: a day already carrying two erector movements takes no more of them. This is what put
              // a T-bar row and a third hinge into a day that had hip thrust + RDL + squat + pull-through.
              !(erectorLoad() >= ERECTOR_BUDGET && LOADS_ERECTORS.test(name)),
          ),
        }))
        .filter((b) => b.pool.length > 0)
        // G137. A block may grow only while it would still end up at no MORE than yesterday's count for
        // that muscle. A muscle never trained yesterday is unaffected. Authored slots are left alone either
        // way — this withholds depth, it does not delete what a template deliberately prescribes.
        .filter((b) => {
          const y = yesterday.get(b.muscle);
          return y === undefined || b.size < y;
        })
        // A count the template fixed on purpose (G138). See TemplateDay.noDepth.
        .filter((b) => !day.noDepth?.includes(b.muscle));

      // No muscle in this day has an unused exercise left. Stop rather than loop: a day that cannot reach
      // the figure honestly is better than one padded with repeats.
      if (!blocks.length) break;

      // Depth goes to the leading block first, since the day opens on the emphasised muscle (G105), but no
      // single muscle runs deeper than three before the next one earns its second exercise.
      //
      // The second clause is a HARD cap (G136), not a fallback to `blocks[0]`. That fallback is what let a
      // day put seven exercises on one muscle: once every block was at three it kept feeding the first one.
      // Stopping short of the exercise target is the correct outcome -- the same judgement the `break`
      // below already makes when no pool has anything left.
      const choice = blocks.find((b) => b.size < 3) ?? blocks.find((b) => b.size < MAX_PER_MUSCLE);
      if (!choice) break;
      const pick = choice.pool[0];
      // Sets and reps follow the block's existing work rather than being invented: the added exercise is
      // more of the same job, so it gets the same prescription, one set lighter and a little higher in reps.
      const neighbour = slots[choice.end];
      // G132 caps the inserted work at three sets as well as the authored work. Without the clamp an
      // insertion beside a 4-set opener inherited 3 and one beside a 5-set opener inherited 4.
      slots.splice(choice.end + 1, 0, [
        pick,
        Math.min(MAX_TEMPLATE_SETS, Math.max(2, neighbour[1] - 1)),
        Math.min(MAX_INSERTED_REPS, neighbour[2] + 2),
      ]);
      used.add(pick);
    }

    days.push({ name: day.name, slots: slots.map((s) => [s[0], s[1], s[2]] as const) });
  });

  return { ...spec, days };
}

export function deepenAll(specs: readonly TemplateSpec[]): TemplateSpec[] {
  return specs.map(deepen);
}
