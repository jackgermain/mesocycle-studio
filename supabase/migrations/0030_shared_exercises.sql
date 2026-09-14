-- Exercises added inside the app that every account gets.
--
-- Jack, after searching the picker for "Hip Clean" and getting "No exercises match": "Add a button for me
-- to add an exercise here.. and make it universal so it saves across all accounts."
--
-- The built-in library is a code constant (src/coach/exerciseLibrary.ts) compiled into the bundle, so there
-- is no row anywhere to add one to. This table is that row. Every signed-in account reads it on load and
-- merges it over the shipped library, so one write here reaches everybody.
--
-- Deliberately NOT the same thing as coach_state.customExercises, which already exists and stays. Those are
-- per-coach: they live inside that one coach's jsonb blob, they are invisible to their clients, and they are
-- invisible on the client Train tab entirely, because useCoachStore is not mounted on client routes -- which
-- is precisely why SimpleExercisePicker cannot read them and why a second mechanism is needed rather than a
-- reuse of the first. A coach who wants a private exercise still has Library -> add.
--
-- `muscle` is constrained rather than free text on purpose. Weekly volume, the soreness check and the
-- synergist table all key off the MUSCLE_GROUPS taxonomy, and an exercise carrying anything outside it
-- books its work against nothing at all -- silently, which is how "Deadlifts" became a Romanian deadlift
-- and nobody noticed. The check is the backstop for the picker's own muscle chips.
--
-- Read by anyone signed in, written only by the platform admin: the same capability 0010 introduced and the
-- same split 0029 uses, because adding to the shipped library is a platform-owner action, not a coaching
-- one.
--
-- The admin check is ALIASED (`accounts adm`). 0011 exists because the unaliased form was ambiguous against
-- a function's own return columns and silently never ran, breaking a screen for everyone instead of failing
-- closed. Same shape here, same reason.

create table public.library_exercises (
  id text primary key,
  name text not null,
  muscle text not null,
  kind text not null default 'strength',
  created_at timestamptz not null default now(),
  constraint library_exercises_muscle_known check (muscle in (
    'Abs','Back','Biceps','Calves','Chest','Forearms','Front delts','Side delts','Rear delts',
    'Full body','Glutes','Hamstrings','Adductors','Obliques','Quads','Traps','Triceps'
  ))
);

-- One row per name, case-insensitively. The picker dedupes on the name, so two rows differing only in
-- capitalisation would render as two separate entries for the same movement.
create unique index library_exercises_name_ci on public.library_exercises (lower(name));

alter table public.library_exercises enable row level security;

-- Everyone signed in reads them: that is the entire point -- an addition has to reach every account.
create policy "library_exercises_select" on public.library_exercises
  for select to authenticated
  using (true);

create policy "library_exercises_admin_write" on public.library_exercises
  for all to authenticated
  using (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin))
  with check (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin));

-- anon has no business here: it is not a public listing, it is the app's own library state.
revoke all on public.library_exercises from anon;
grant select, insert, update, delete on public.library_exercises to authenticated;
