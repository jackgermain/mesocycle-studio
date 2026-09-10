/** Reading Postgres/PostgREST errors, with no Supabase client import.
 *
 * Deliberately free of `../lib/supabase`: that module reads `import.meta.env` at load time, which only
 * exists under Vite, so anything importing it cannot be unit-tested. Pure classifiers like this one are
 * exactly what the tests need to reach, so they live here.
 */

/** Is this error "the table isn't there yet"?
 *
 * Migrations in this project are applied by hand, so code routinely ships before its SQL does and a
 * feature has to be able to tell that its own table is missing and hide itself.
 *
 * Postgres says 42P01, "relation does not exist" -- but PostgREST answers from its own schema cache and
 * never gets that far, returning PGRST205 and "Could not find the table '<x>' in the schema cache".
 * Checking only for the Postgres code silently never matched. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /does not exist|schema cache/i.test(error.message ?? "");
}

/** Is this error "that function isn't there yet"? Same split: Postgres 42883, PostgREST PGRST202. */
export function isMissingFunction(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42883" || error.code === "PGRST202") return true;
  return /could not find the function|function .* does not exist/i.test(error.message ?? "");
}
