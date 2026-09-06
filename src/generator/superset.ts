/** Supersets: pairing exercises to buy volume, once the heavy work is done.
 *
 * > *"Supersetting is helpful sometimes. I usually like to do them later in the lifts... After your first
 * > two exercises, which are usually your heavy hitters, you start supersetting exercises with your other
 * > exercises later in the workout... It doesn't have to be done. **I wouldn't do it if somebody's trying
 * > to get really strong on an exercise, but it's a fantastic way of adding volume.**"*
 *
 * So this is an optional layer with two hard edges -- never in the opening slots, never on a lift someone
 * is trying to get strong on -- and one purpose, which is volume. It also explains a number from section
 * 7: exercises per session is 9-12 *"if you're not planning on supersetting any exercises together"*.
 * Pairing raises the count that fits in the same hour.
 *
 * Who it suits: *"pretty normal in strength and conditioning -- if somebody wants general fitness and
 * they want to be a little bit more athletic, have a little more endurance, be a little more
 * conditioned."*
 */

/** How a pair relates, which is what makes it a sensible pairing rather than two exercises in a row. */
export type PairingKind =
  /** Opposing muscles -- one rests while the other works. His biceps/triceps example. */
  | "antagonist"
  /** Neighbouring muscles that share a job. His biceps/forearms example. */
  | "adjacent"
  /** The same muscle twice, the second usually easier. His flies into push-ups. */
  | "same-muscle"
  /** Three or more in a round, repeated -- the strength-and-conditioning shape. */
  | "circuit";

const ANTAGONIST: Record<string, string[]> = {
  Biceps: ["Triceps"], Triceps: ["Biceps"],
  Chest: ["Back"], Back: ["Chest"],
  Quads: ["Hamstrings"], Hamstrings: ["Quads"],
  "Front delts": ["Rear delts"], "Rear delts": ["Front delts"],
  Abs: ["Obliques"], Obliques: ["Abs"],
};

const ADJACENT: Record<string, string[]> = {
  Biceps: ["Forearms", "Back"], Forearms: ["Biceps"],
  Back: ["Biceps", "Rear delts", "Traps"], Traps: ["Back", "Rear delts"],
  Chest: ["Triceps", "Front delts"], Triceps: ["Chest", "Front delts"],
  "Front delts": ["Chest", "Side delts"], "Side delts": ["Front delts", "Rear delts"],
  "Rear delts": ["Back", "Traps"],
  Glutes: ["Hamstrings"], Hamstrings: ["Glutes"],
  Quads: ["Adductors", "Calves"], Adductors: ["Quads"], Calves: ["Quads"],
};

export function pairingKind(a: string, b: string): PairingKind | undefined {
  if (a === b) return "same-muscle";
  if (ANTAGONIST[a]?.includes(b)) return "antagonist";
  if (ADJACENT[a]?.includes(b) || ADJACENT[b]?.includes(a)) return "adjacent";
  return undefined;
}

/** Slots before this index are never paired -- *"your first two exercises, which are usually your heavy
 * hitters"*. Matches STRENGTH_SLOTS in the session structure, and for the same reason. */
export const FIRST_PAIRABLE_SLOT = 2;

export function canSuperset(slotIndex: number, strengthPriority = false): boolean {
  return !strengthPriority && slotIndex >= FIRST_PAIRABLE_SLOT;
}

export interface Superset {
  /** Slot indexes in the round, in order. Two for a pair, three or more for a circuit. */
  slots: number[];
  kind: PairingKind;
  why: string;
}

/** Pair up the back half of a session.
 *
 * Walks forward and pairs each eligible slot with the next eligible one it actually relates to, rather
 * than blindly pairing neighbours -- two unrelated exercises back to back is just a rushed session, not a
 * superset. Leaves anything it cannot pair alone, which is the right answer: *"it doesn't have to be
 * done."* */
export function proposeSupersets(
  slots: { index: number; muscle?: string; strengthPriority?: boolean }[],
  opts: { circuit?: boolean } = {},
): Superset[] {
  const eligible = slots.filter(
    (s) => s.muscle && canSuperset(s.index, s.strengthPriority ?? false),
  );
  const out: Superset[] = [];
  const taken = new Set<number>();

  for (let i = 0; i < eligible.length; i++) {
    const a = eligible[i];
    if (taken.has(a.index)) continue;
    for (let j = i + 1; j < eligible.length; j++) {
      const b = eligible[j];
      if (taken.has(b.index)) continue;
      const kind = pairingKind(a.muscle!, b.muscle!);
      if (!kind) continue;
      taken.add(a.index);
      taken.add(b.index);
      out.push({
        slots: [a.index, b.index],
        kind,
        why:
          kind === "antagonist"
            ? `${a.muscle} and ${b.muscle} oppose each other, so one rests while the other works`
            : kind === "same-muscle"
              ? `${a.muscle} twice — the second movement finishes what the first started`
              : `${a.muscle} and ${b.muscle} sit next to each other and share the work`,
      });
      break;
    }
  }

  if (opts.circuit && out.length >= 2) {
    // The strength-and-conditioning shape: "a pull-up with a tricep pushdown with an external rotation
    // with a band, and then you just repeat the circuit a couple times". Collapse the pairs into rounds.
    const merged: Superset[] = [];
    for (let i = 0; i < out.length; i += 2) {
      const group = out.slice(i, i + 2).flatMap((p) => p.slots);
      merged.push({
        slots: group,
        kind: "circuit",
        why: `${group.length} exercises in a round, repeated — conditioning rather than strength`,
      });
    }
    return merged;
  }
  return out;
}

/** His favourite, recorded because it is the clearest example of the same-muscle case and because it
 * belongs at the very end: *"cable flies or dumbbell flies supersetted with push-ups are amazing, and I
 * only do these usually last in my workout."* */
export const EXEMPLAR_PAIRS: { a: string; b: string; note: string }[] = [
  { a: "Dumbbell Fly", b: "Push-Up", note: "his favourite; last in the session only" },
  { a: "Barbell Curl", b: "Tricep Rope Pushdown", note: "antagonist, bodybuilding-style" },
  { a: "Barbell Curl", b: "Wrist Curl", note: "adjacent, bodybuilding-style" },
];
