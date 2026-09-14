-- Let a coach or a General account add an exercise, not only the platform owner.
--
-- 0030 gated every write on is_platform_admin, matching 0029's template overrides. That was the wrong
-- parallel. Renaming or deleting somebody else's template is a platform-owner act; adding a movement the
-- library is missing is just using the app, and Jack hit it immediately -- searching "Hip Clean", finding
-- nothing, and having no way forward.
--
-- The flag made it worse in a way worth recording. is_platform_admin is set directly in SQL and is surfaced
-- nowhere a person can see, so when the button did not appear there was no way to tell a false flag from a
-- stale bundle: both render as an absent button. A role is loaded on every session and visible in the app,
-- which makes the same failure diagnosable.
--
-- Split deliberately, rather than opening the table up. INSERT is open to anyone who authors their own
-- training. UPDATE and DELETE stay with the platform owner, because an exercise other people's programs
-- already point at is not one person's to rename or remove -- and unlike an addition, neither is reversible
-- from inside the app.
--
-- `active` is checked as well as the role: a revoked account keeps its row, and 0010's flag is what
-- revocation actually flips.
--
-- Every admin check stays ALIASED (`accounts adm`). 0011 exists because the unaliased form was ambiguous
-- and silently never ran, breaking a screen for everyone instead of failing closed.

drop policy if exists "library_exercises_admin_write" on public.library_exercises;

create policy "library_exercises_insert" on public.library_exercises
  for insert to authenticated
  with check (exists (
    select 1 from public.accounts a
    where a.id = auth.uid() and a.role in ('coach', 'friend') and a.active
  ));

create policy "library_exercises_admin_update" on public.library_exercises
  for update to authenticated
  using (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin))
  with check (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin));

create policy "library_exercises_admin_delete" on public.library_exercises
  for delete to authenticated
  using (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin));
