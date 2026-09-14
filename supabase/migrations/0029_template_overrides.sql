-- Template edits that apply to everybody.
--
-- Jack: "if I'm on my account and I rename a template I want it to be renamed on everybody's account, if I
-- delete a template I want it to be deleted on everybody's account, if I modify a template by reducing
-- amount of sets or what not I want it to be shown for everybody."
--
-- The 125 built-in templates are code constants compiled into the bundle, so there is no row anywhere to
-- rename, hide, or edit. This table is that row. The app reads every override on load and layers them over
-- the shipped library, so one write here changes what every signed-in account sees.
--
-- `days` holds the whole edited week (BuilderDay[]) when the contents have been changed, and is null when
-- only the name or visibility was touched. Storing the full week rather than a diff is deliberate: a diff
-- against a library that ships new versions of itself would silently re-apply to the wrong exercises the
-- next time a template changed in code.
--
-- Read by anyone signed in, written only by the platform admin -- the same capability 0010 introduced, kept
-- separate from the coach/client/friend roles because this is a platform-owner action, not a coaching one.
--
-- The admin check is ALIASED (`accounts adm`). 0011 exists because the unaliased form was ambiguous against
-- a function's own return columns and silently never ran, breaking a screen for everyone instead of failing
-- closed. Same shape here, same reason.

create table public.template_overrides (
  template_id text primary key,
  name text,
  hidden boolean not null default false,
  days jsonb,
  updated_at timestamptz not null default now()
);

alter table public.template_overrides enable row level security;

-- Everyone signed in reads them: that is the entire point -- a change has to reach every account.
create policy "template_overrides_select" on public.template_overrides
  for select to authenticated
  using (true);

create policy "template_overrides_admin_write" on public.template_overrides
  for all to authenticated
  using (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin))
  with check (exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin));

-- anon has no business here: it is not a public listing, it is the app's own template state.
revoke all on public.template_overrides from anon;
grant select, insert, update, delete on public.template_overrides to authenticated;
