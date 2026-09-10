/** The arithmetic behind swipe-to-reveal, kept out of the .tsx on purpose.
 *
 * Node's type stripping runs TypeScript but not JSX, so nothing inside a .tsx file can be reached from a
 * test at all. Pure logic therefore lives on this side of the line -- and these three decisions are worth
 * testing, because they are where the gesture goes wrong in ways you can only feel: a roster that drags
 * sideways while you scroll it, a row that pops open from a twitch, or one that springs shut after a
 * deliberate swipe.
 */
export const ACTION_WIDTH = 96;

/** Movement before the gesture commits to an axis. Small enough not to feel laggy, large enough that a
 * scroll which drifts a pixel sideways is still a scroll. */
const AXIS_LOCK_PX = 8;

/** Past this fraction of the action's width, releasing snaps open rather than back. */
const OPEN_AT = 0.4;

/** Which way is this gesture going? "none" until it has moved far enough to be sure. */
export function decideAxis(mx: number, my: number): "none" | "h" | "v" {
  if (Math.abs(mx) < AXIS_LOCK_PX && Math.abs(my) < AXIS_LOCK_PX) return "none";
  return Math.abs(mx) > Math.abs(my) ? "h" : "v";
}

/** Where the row sits mid-drag: rubber-banded past the action's width, and barely movable to the right,
 * where there is nothing to reveal. */
export function dragOffset(startOffset: number, mx: number): number {
  const next = startOffset + mx;
  return next > 0 ? next * 0.25 : Math.max(next, -ACTION_WIDTH * 1.25);
}

/** On release: far enough left to stay open, or does it spring back? */
export function shouldSnapOpen(offset: number): boolean {
  return offset < -ACTION_WIDTH * OPEN_AT;
}
