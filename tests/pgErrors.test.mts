/** Whether a feature whose migration hasn't been run yet hides itself.
 *
 * Migrations here are applied by hand, so code routinely ships before its SQL does. Getting this
 * classifier wrong goes one of two ways, and both are bad: a client taps "form check" into a 404, or one
 * transient network error permanently hides a feature that is actually there. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isMissingTable } from "../src/shared/pgErrors.ts";

test("PostgREST's schema-cache miss counts as missing", () => {
  // What the live API actually returns -- PostgREST answers from its own cache and never reaches
  // Postgres, so the 42P01 this used to look for never arrives.
  assert.equal(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.form_checks' in the schema cache" }), true);
});

test("Postgres's own relation-does-not-exist counts as missing", () => {
  assert.equal(isMissingTable({ code: "42P01", message: 'relation "public.form_checks" does not exist' }), true);
});

test("an unrecognised code still matches on the message", () => {
  assert.equal(isMissingTable({ code: "XX000", message: 'relation "form_checks" does not exist' }), true);
});

test("a transient failure is NOT treated as a missing table", () => {
  // The one that matters: caching these as "unavailable" hides a working feature for the whole session.
  for (const e of [
    { code: "PGRST301", message: "JWT expired" },
    { code: "42501", message: "permission denied for table form_checks" },
    { message: "Failed to fetch" },
    { code: "23505", message: "duplicate key value violates unique constraint" },
  ]) {
    assert.equal(isMissingTable(e), false, JSON.stringify(e));
  }
});

test("no error is not a missing table", () => {
  assert.equal(isMissingTable(null), false);
});
