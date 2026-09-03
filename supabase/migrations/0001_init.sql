-- Mesocycle Studio — initial real backend schema
-- One row per person in `accounts`, tied 1:1 to Supabase's own auth.users.
-- Each account gets a jsonb "state" blob mirroring the app's existing in-memory
-- shape (client_state for the client app, coach_state for the coach app) —
-- this keeps almost all of the existing React/reducer code unchanged; only the
-- persistence layer moves from localStorage to these tables.
--
-- Nobody can insert into `accounts` directly — accounts are only ever created
-- through the two SECURITY DEFINER functions below (bootstrap_coach,
-- claim_invite), so a client can never grant themselves the "coach" role or
-- attach themselves to someone else's roster.

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach','client','friend')),
  display_name text not null,
  coach_id uuid references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.client_state (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.coach_state (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.invites (
  code text primary key,
  coach_id uuid not null references public.accounts(id) on delete cascade,
  role text not null check (role in ('client','friend')),
  client_name text not null,
  claimed_by uuid references public.accounts(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.accounts enable row level security;
alter table public.client_state enable row level security;
alter table public.coach_state enable row level security;
alter table public.invites enable row level security;

-- accounts: see your own row, or (if you're a coach) any row you coach
create policy "accounts_select" on public.accounts
  for select using (id = auth.uid() or coach_id = auth.uid());

-- client_state: the account owner or their coach may read/write
create policy "client_state_select" on public.client_state
  for select using (
    account_id = auth.uid()
    or account_id in (select id from public.accounts where coach_id = auth.uid())
  );
create policy "client_state_update" on public.client_state
  for update using (
    account_id = auth.uid()
    or account_id in (select id from public.accounts where coach_id = auth.uid())
  );

-- coach_state: only the coach themself
create policy "coach_state_select" on public.coach_state
  for select using (account_id = auth.uid());
create policy "coach_state_update" on public.coach_state
  for update using (account_id = auth.uid());

-- invites: a coach manages only her own invites
create policy "invites_select_own" on public.invites
  for select using (coach_id = auth.uid());
create policy "invites_insert_own" on public.invites
  for insert with check (
    coach_id = auth.uid()
    and exists (select 1 from public.accounts where id = auth.uid() and role = 'coach')
  );

-- Public, safe-fields-only lookup so an unauthenticated visitor can see
-- "You're invited by <coach>" before they've signed in.
create or replace function public.get_invite(p_code text)
returns table(code text, role text, client_name text, used_at timestamptz, coach_name text)
language sql
security definer
set search_path = public
as $$
  select i.code, i.role, i.client_name, i.used_at, a.display_name as coach_name
  from public.invites i
  join public.accounts a on a.id = i.coach_id
  where i.code = upper(trim(p_code));
$$;

-- The very first person to sign in can claim the coach role; nobody else can
-- (there's exactly one coach in this app today).
create or replace function public.bootstrap_coach(p_display_name text)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
begin
  if exists (select 1 from public.accounts where role = 'coach') then
    raise exception 'A coach account already exists';
  end if;
  if exists (select 1 from public.accounts where id = auth.uid()) then
    raise exception 'Account already exists';
  end if;

  insert into public.accounts (id, role, display_name, coach_id)
  values (auth.uid(), 'coach', p_display_name, null)
  returning * into v_account;

  insert into public.coach_state (account_id, data) values (auth.uid(), '{}'::jsonb);

  return v_account;
end;
$$;

-- Turns a valid, unused invite code into a real account for the signed-in
-- user, and marks the invite used. This is the only way a client/friend
-- account (and its coach_id) ever gets set.
create or replace function public.claim_invite(p_code text, p_display_name text)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_account public.accounts;
begin
  select * into v_invite from public.invites where code = upper(trim(p_code));
  if v_invite is null then
    raise exception 'Invite not found';
  end if;
  if v_invite.used_at is not null then
    raise exception 'Invite already used';
  end if;
  if exists (select 1 from public.accounts where id = auth.uid()) then
    raise exception 'Account already exists';
  end if;

  insert into public.accounts (id, role, display_name, coach_id)
  values (auth.uid(), v_invite.role, p_display_name, v_invite.coach_id)
  returning * into v_account;

  insert into public.client_state (account_id, data) values (auth.uid(), '{}'::jsonb);

  update public.invites set used_at = now(), claimed_by = auth.uid() where code = v_invite.code;

  return v_account;
end;
$$;

grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.bootstrap_coach(text) to authenticated;
grant execute on function public.claim_invite(text, text) to authenticated;
