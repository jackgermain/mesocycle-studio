/** Defaults and helpers for cardio/conditioning blocks — logged as work + rest duration rather than reps and load. */

export const CARDIO_DEFAULT = { workSec: 900, restSec: 0 }; // a 15-minute steady-state effort by default

/** Fine control for sprint-length efforts, coarse jumps once you're into steady-state territory. */
export function workStep(currentSec: number): number {
  return currentSec < 120 ? 15 : 60;
}

export const REST_STEP = 15;

export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec === 0 ? `${min} min` : `${min}:${String(sec).padStart(2, "0")}`;
}
