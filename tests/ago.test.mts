/** How old a signal is, in the few characters a triage list can spare. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ago } from "../src/shared/ago.ts";

const now = new Date("2026-09-10T12:00:00Z");
const minsAgo = (n: number) => new Date(now.getTime() - n * 60000).toISOString();

test("under a minute is 'now', not '0m'", () => {
  assert.equal(ago(minsAgo(0), now), "now");
  assert.equal(ago(minsAgo(0.5), now), "now");
});

test("clock skew into the future is still 'now'", () => {
  // A phone a minute ahead of the database must not produce "-1m".
  assert.equal(ago(new Date(now.getTime() + 60000).toISOString(), now), "now");
});

test("minutes, hours, days, weeks", () => {
  assert.equal(ago(minsAgo(12), now), "12m");
  assert.equal(ago(minsAgo(59), now), "59m");
  assert.equal(ago(minsAgo(60), now), "1h");
  assert.equal(ago(minsAgo(60 * 25), now), "1d");
  assert.equal(ago(minsAgo(60 * 24 * 6), now), "6d");
  assert.equal(ago(minsAgo(60 * 24 * 7), now), "1w");
});

test("missing or unparseable dates produce nothing to render", () => {
  assert.equal(ago(null, now), "");
  assert.equal(ago(undefined, now), "");
  assert.equal(ago("not a date", now), "");
});
