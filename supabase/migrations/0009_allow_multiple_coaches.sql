-- Every other part of the schema was already scoped per-coach (coach_id on accounts, account_id checks
-- on coach_state/client_state, invites tied to coach_id) -- the single-coach restriction lived only in
-- this one check. Removing it so anyone can sign up and become a coach, ahead of selling this to other
-- coaches to run their own independent roster on the same platform.
create or replace function public.bootstrap_coach(p_display_name text)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
begin
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
