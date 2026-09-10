/** Which colour the dial takes.
 *
 * The rule is worst-wins, and only counting rows that actually have something in them. A green ring over
 * a red row is the summary contradicting the detail; a red ring when the only red row reads 0 is an alarm
 * about nothing. */
import { test } from "node:test";
import assert from "node:assert/strict";

// Mirrors worstTone() in UI.tsx. The component is a .tsx and Node's type stripping cannot run JSX, so the
// rule lives here as its specification.
type Row = { value?: number; tone?: "danger" | "warn" | "caution" };
const RANK: ("danger" | "warn" | "caution")[] = ["danger", "warn", "caution"];
const worst = (rows: Row[]) => RANK.find((t) => rows.some((r) => r.tone === t && (r.value ?? 0) > 0)) ?? "accent";

test("no rows with anything in them stays accent", () => {
  assert.equal(worst([{ value: 0, tone: "danger" }, { value: 0, tone: "caution" }]), "accent");
});

test("a lone caution row makes it caution", () => {
  assert.equal(worst([{ value: 0, tone: "danger" }, { value: 4, tone: "caution" }]), "caution");
});

test("danger beats warn beats caution", () => {
  assert.equal(worst([{ value: 4, tone: "caution" }, { value: 1, tone: "warn" }]), "warn");
  assert.equal(worst([{ value: 4, tone: "caution" }, { value: 1, tone: "warn" }, { value: 2, tone: "danger" }]), "danger");
});

test("a zero on the most severe row does not claim the ring", () => {
  // Jack's actual Desk: 2 joint flags is red, but with 0 joint flags and 4 unlogged it must be yellow.
  assert.equal(worst([{ value: 0, tone: "danger" }, { value: 0, tone: "warn" }, { value: 4, tone: "caution" }]), "caution");
});

test("untoned rows never colour the ring", () => {
  assert.equal(worst([{ value: 9 }, { value: 3 }]), "accent");
});
