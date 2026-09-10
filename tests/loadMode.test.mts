/** Load values are clamped per mode. 70 means pounds in one mode, %1RM in another, and an RPE in a
 * third — a shared clamp would let an RPE of 45 through and silently prescribe it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampLoadValue, LOAD_RANGE, LOAD_DEFAULT, LOAD_LABELS } from "../src/coach/loadMode.ts";
import type { LoadMode } from "../src/coach/types.ts";

const MODES: LoadMode[] = ["lb", "pct1rm", "rpe", "rir"];

test("every mode has a range, a default and a label", () => {
  for (const m of MODES) {
    assert.ok(LOAD_RANGE[m], `${m} has no range`);
    assert.ok(LOAD_DEFAULT[m] !== undefined, `${m} has no default`);
    assert.ok(LOAD_LABELS[m], `${m} has no label`);
  }
});

test("each mode's default sits inside its own range", () => {
  for (const m of MODES) {
    const { min, max } = LOAD_RANGE[m];
    assert.ok(LOAD_DEFAULT[m] >= min && LOAD_DEFAULT[m] <= max, `${m} default ${LOAD_DEFAULT[m]} outside ${min}-${max}`);
  }
});

test("values are clamped to the mode's range, not a shared one", () => {
  for (const m of MODES) {
    const { min, max } = LOAD_RANGE[m];
    assert.ok(clampLoadValue(max + 500, m) <= max, `${m} let a value above max through`);
    assert.ok(clampLoadValue(min - 500, m) >= min, `${m} let a value below min through`);
  }
});

test("an effort mode cannot hold a barbell weight", () => {
  // The concrete version of the above: 225 in an RPE field is a mistake, not a prescription.
  assert.ok(clampLoadValue(225, "rpe") <= LOAD_RANGE.rpe.max);
  assert.ok(clampLoadValue(225, "rir") <= LOAD_RANGE.rir.max);
});

test("a percentage cannot exceed 100", () => {
  assert.ok(clampLoadValue(150, "pct1rm") <= 100);
});
