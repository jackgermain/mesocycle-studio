/** Where the Progress tab's charts actually put their marks.
 *
 * Split out of the components for one reason: a chart is the thing reading code cannot check. An SVG whose
 * arithmetic is right but whose marks land outside the viewBox looks identical in a diff and is simply
 * missing on a phone — and the Progress tab shipped without ever being rendered, because the browser was
 * not opened. Pure functions can at least be asserted against their own frame.
 *
 * Every one of these is total: a single point, a flat series, an empty list and a span of zero all have to
 * produce coordinates inside the box rather than NaN, which is what a naive `(v - min) / (max - min)` does
 * the moment every value is the same — and a lift held at the same weight for three weeks is the common
 * case, not the edge case.
 */

export interface Box {
  width: number;
  height: number;
  /** Kept clear on every side so a round line cap is not sliced off by the frame. */
  pad: number;
}

export const SPARKLINE_BOX: Box = { width: 46, height: 20, pad: 2 };

/** Points for a sparkline, evenly spaced across the box and scaled to the series' own range.
 *
 * Higher values sit HIGHER, which SVG does not do for free: y grows downward, so the value fraction is
 * subtracted from the bottom rather than added to the top. Getting that backwards draws a lift that is
 * going up as a line heading down, and nothing about the output looks wrong until you see it. */
export function sparklinePoints(values: number[], box: Box = SPARKLINE_BOX): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const top = box.pad;
  const bottom = box.height - box.pad;
  const left = box.pad;
  const right = box.width - box.pad;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return values.map((v, i) => ({
    // A single point sits at the left edge rather than dividing by zero.
    x: values.length === 1 ? left : left + (i / (values.length - 1)) * (right - left),
    // A flat series sits on the middle line: there is no "high" or "low" to show, and pinning it to the
    // top or the bottom would read as a maximum or a collapse.
    y: span === 0 ? (top + bottom) / 2 : bottom - ((v - min) / span) * (bottom - top),
  }));
}

export function sparklinePath(values: number[], box: Box = SPARKLINE_BOX): string {
  const pts = sparklinePoints(values, box);
  if (pts.length === 0) return "";
  const round = (n: number) => Math.round(n * 100) / 100;
  return `M${pts.map((p) => `${round(p.x)},${round(p.y)}`).join(" L")}`;
}

/** How tall a week-over-week bar is drawn, and which way it points.
 *
 * Scaled against the biggest change in the set so a flat block is not drawn as flat nothing — but with a
 * floor, because a 0.0 week still has to be visible as a mark on the line rather than as an absence. */
export function deltaBar(
  change: number,
  biggest: number,
  opts: { max?: number; min?: number } = {},
): { height: number; direction: "up" | "down" } {
  const max = opts.max ?? 26;
  const min = opts.min ?? 4;
  const scale = Math.max(Math.abs(biggest), 0.001);
  const height = Math.min(max, Math.max(min, (Math.abs(change) / scale) * max));
  return { height, direction: change >= 0 ? "up" : "down" };
}

/** Bar height for one day's calories, against a ceiling that always leaves the target line on screen.
 *
 * The ceiling is the greater of the target plus headroom and the biggest day, so a blowout day is drawn at
 * full height instead of overflowing, and a week of small days does not push the target line off the top. */
export function intakeBarHeight(
  kcal: number,
  logged: boolean,
  ceiling: number,
  boxHeight: number,
): number {
  if (!logged) return 3;
  if (!(ceiling > 0)) return 3;
  return Math.min(boxHeight, Math.max(4, (kcal / ceiling) * boxHeight));
}

export function intakeCeiling(kcals: number[], target: number): number {
  return Math.max(target * 1.3, ...kcals, 1);
}
