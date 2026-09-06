-- Coach signup needs a code.
--
-- bootstrap_coach() is granted to `authenticated`, takes only a display name, and creates a coach
-- account for whoever calls it. Nothing server-side stops a person who signs up through the normal
-- flow from calling it directly and appearing on the platform as a coach -- the only thing standing
-- in the way is which button the UI happens to render, which is not access control.
--
-- That is tolerable while the only people with the URL are known. It is not tolerable in an open beta,
-- where the most likely visitor is an invited client who signed up on the wrong screen.
--
-- This adds a one-time code table and a new RPC that requires one. The old function is revoked rather
-- than dropped, so an account created before this ran is untouched and the change is reversible by
-- re-granting.

create table if not exists public.coach_signup_codes (
  code        text primary key,
  note        text,                         -- who it was issued to, for your own records
  created_at  timestamptz not null default now(),
  used_by     uuid references auth.users(id) on delete set null,
  used_at     timestamptz
);

alter table public.coach_signup_codes enable row level security;
-- No policies at all: the table is reachable only through the SECURITY DEFINER function below, so a
-- signed-in user can neither read the list of codes nor guess at one by querying.

create or replace function public.bootstrap_coach_with_code(p_display_name text, p_code text)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_code    public.coach_signup_codes;
begin
  if exists (select 1 from public.accounts where id = auth.uid()) then
    raise exception 'Account already exists';
  end if;

  -- Locked so two people redeeming the same code at once cannot both succeed.
  select * into v_code
  from public.coach_signup_codes
  where code = trim(p_code) and used_by is null
  for update;

  if v_code.code is null then
    raise exception 'That coach signup code is not valid';
  end if;

  insert into public.accounts (id, role, display_name, coach_id)
  values (auth.uid(), 'coach', p_display_name, null)
  returning * into v_account;

  insert into public.coach_state (account_id, data) values (auth.uid(), '{}'::jsonb);

  update public.coach_signup_codes
     set used_by = auth.uid(), used_at = now()
   where code = v_code.code;

  return v_account;
end;
$$;

grant execute on function public.bootstrap_coach_with_code(text, text) to authenticated;

-- Close the ungated door. Revoke rather than drop: dropping would break any older deployed bundle
-- still calling it, and re-granting is the one-line rollback if this turns out to be too strict.
revoke execute on function public.bootstrap_coach(text) from authenticated;

-- Issue yourself a code to sign up with. Change the string before running.
insert into public.coach_signup_codes (code, note)
values ('JACKED-COACH-3BHM38', 'first coach')
on conflict (code) do nothing;
