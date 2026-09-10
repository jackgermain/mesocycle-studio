-- Coaches come in through a named invite link, like everyone else.
--
-- Until now there were two ways to become an account, and they worked nothing alike. A client or friend
-- got a personal link carrying their name, clicked it, and landed already identified. A coach got a bare
-- signup URL and a one-time code, and then had to type their own name into a form on the landing page --
-- a form that also had to offer an invite-code field, because the same screen is where an invited client
-- ends up if anything interrupts their claim. That screen could not be written to make sense for both
-- readers at once, and in beta it read as the app demanding an invite code from the platform owner.
--
-- One path for everyone removes the screen instead of rewording it. The name goes on the invite, where
-- it already goes for a client, and 0018's signup-code table stops being needed -- the link IS the code.
--
-- 0018 and 0019 are left in place: coach_signup_codes and bootstrap_coach_with_code still exist and any
-- coach created through them keeps working. Nothing calls them after this.

alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check
  check (role in ('client', 'friend', 'coach'));

-- Only the platform owner may mint a coach invite. Without this any coach could hand out coach accounts,
-- which is the same hole 0018 closed for the un-coded signup function, reopened through a different door.
-- `coach_id` still points at whoever issued it -- that is the audit trail for who brought a coach on, and
-- it is what get_invite() reads to say "<name> sent you this link".
drop policy if exists "invites_insert_own" on public.invites;
create policy "invites_insert_own" on public.invites
  for insert with check (
    coach_id = auth.uid()
    and exists (select 1 from public.accounts where id = auth.uid() and role = 'coach')
    and (
      role in ('client', 'friend')
      or exists (select 1 from public.accounts where id = auth.uid() and is_platform_admin = true)
    )
  );

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

  -- A coach is nobody's client. Carrying the issuer's id into coach_id would quietly attach the new
  -- coach to the platform owner's roster, which is the opposite of what an independent coach account is.
  insert into public.accounts (id, role, display_name, coach_id)
  values (
    auth.uid(),
    v_invite.role,
    p_display_name,
    case when v_invite.role = 'coach' then null else v_invite.coach_id end
  )
  returning * into v_account;

  -- And they need the other state table. A coach with a client_state row and no coach_state row hydrates
  -- an empty roster on every load and can never save one.
  if v_invite.role = 'coach' then
    insert into public.coach_state (account_id, data) values (auth.uid(), '{}'::jsonb);
  else
    insert into public.client_state (account_id, data) values (auth.uid(), '{}'::jsonb);
  end if;

  update public.invites set used_at = now(), claimed_by = auth.uid() where code = v_invite.code;

  return v_account;
end;
$$;

revoke execute on function public.claim_invite(text, text) from public;
grant execute on function public.claim_invite(text, text) to authenticated;
