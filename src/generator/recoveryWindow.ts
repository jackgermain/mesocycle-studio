/** How much volume a session should carry, answered by when the muscle finishes healing.
 *
 * This is the rule underneath most of the others, and it is the first thing in the doctrine that says
 * how *much* work a muscle should get rather than how hard or how often:
 *
 * > *"When we're training for muscle growth, the goal is, for the most part, to try to get the muscle to
 * > heal the day before you're gonna train it again. Say you train chest on Monday and Friday. On your
 * > Monday chest session, you want to do enough volume so that you heal on Thursday for your next Friday
 * > session -- or even Thursday evening, if you can get it to be that perfect. What you don't want is to
 * > heal later than Friday, and you don't want to heal on Tuesday or Wednesday. If you healed on Tuesday
 * > or Wednesday, it means you could have added more volume, and thus done more damage, and would have
 * > spent a whole other day growing."*
 *
 * So **session volume is set by the gap to the next session for that muscle**, and the target is to
 * finish recovering exactly one day early. Healing too soon is as much an error as healing too late --
 * it is days of growth left unbought.
 *
 * It also explains the frequency targets in section 9 rather than merely restating them: *"that's why
 * about twice per week frequency for everything is a good rule of thumb, because it makes it easy
 * spreading those total sets across two days or three days."* Twice a week gives a three-to-four day
 * gap, which is a comfortable amount of damage to dose for.
 *
 * The app already collects what this needs. `computeSorenessDue` in `src/shared/soreness.ts` works out
 * which muscles a session is about to train that were trained recently and how many days ago, and the
 * client answers on a 1-5 scale. Its own comment guessed at this -- *"the real signal for whether that
 * muscle's volume is set too high"* -- without a rule to read it against. This is the rule.
 */

/** Where the client's 1-5 soreness answer sits. 1 is wrecked, 5 is fully healed; under 3 is "very sore". */
export const SORENESS_HEALED = 5;
export const SORENESS_VERY_SORE = 3;

export type VolumeVerdict =
  /** Healed too early -- days of growth went unbought. */
  | "add-volume"
  /** Healed the day before, which is the target. */
  | "on-target"
  /** Still not recovered when the next session came round. */
  | "reduce-volume"
  /** The reading cannot distinguish between cases. */
  | "ambiguous";

/** The day, counted from the session that caused the damage, that the muscle should finish healing.
 *
 * Train Monday and Friday and the gap is 4, so the target is day 3 -- Thursday. */
export function targetRecoveryDay(gapDays: number): number {
  return Math.max(1, gapDays - 1);
}

/** The verdict when the recovery day is actually known. */
export function judgeVolume(gapDays: number, recoveredOnDay: number): VolumeVerdict {
  const target = targetRecoveryDay(gapDays);
  if (recoveredOnDay > gapDays) return "reduce-volume";
  if (recoveredOnDay < target) return "add-volume";
  return "on-target";
}

/** The verdict from what the app records today: a 1-5 soreness score taken on the day of the next
 * session for that muscle.
 *
 * Honest about its limits. A score of 5 on session day means the muscle healed *at some point* in the
 * gap -- which is the target case and the healed-too-early case both, and one reading cannot separate
 * them. Only the failure at the far end is unambiguous. Distinguishing "healed Thursday" from "healed
 * Tuesday" needs the client to say *when* it stopped being sore, which is one extra question and the
 * single highest-value thing that could be added to the check-in. */
export function judgeFromSoreness(score: number): VolumeVerdict {
  if (score < SORENESS_VERY_SORE) return "reduce-volume";
  if (score < SORENESS_HEALED) return "on-target";
  return "ambiguous";
}

/** How to act on a verdict, as a multiplier on the muscle's working sets for its next session.
 *
 * Deliberately small. P2 -- small and predictable beats large and surprising -- applies to volume as much
 * as to load, and one session's soreness reading carries a lot of noise: a bad night's sleep moves it as
 * much as a mis-set volume does. One set at a time, inside C1's cap of four. */
export function volumeAdjustment(verdict: VolumeVerdict): number {
  switch (verdict) {
    case "add-volume":
      return 1;
    case "reduce-volume":
      return -1;
    default:
      return 0;
  }
}

export function explainVolume(verdict: VolumeVerdict, muscle: string, gapDays: number): string {
  const target = targetRecoveryDay(gapDays);
  switch (verdict) {
    case "add-volume":
      return `${muscle} recovered well before the next session. It should finish healing on day ${target} of a ${gapDays}-day gap — anything earlier is a day of growth left on the table, so add a set.`;
    case "reduce-volume":
      return `${muscle} was still sore going into the next session, so the last one did more damage than the gap can absorb. Take a set off.`;
    case "on-target":
      return `${muscle} healed about a day before it was trained again, which is where you want it.`;
    default:
      return `${muscle} was healed by session day, but not when. Asking when the soreness stopped would say whether there is room for more volume.`;
  }
}
