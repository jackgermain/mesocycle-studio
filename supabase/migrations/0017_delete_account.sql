-- Permanent account deletion. A coach can erase one of their own people; the platform admin can erase
-- anyone. This removes the login itself, not just access -- coming back means a fresh signup against a
-- fresh invite.
--
-- Two things about the existing schema shape this function, and both are easy to get wrong:
--
-- 1. accounts.coach_id references accounts(id) ON DELETE CASCADE. Deleting a COACH therefore deletes
--    every client and friend attached to them, and all of their data, in the same statement. That is a
--    very large hammer for one click, so the UI says so in as many words before it is swung. Nothing here
--    softens it -- it is the documented behaviour of the schema, and quietly reparenting a deleted coach's
--    roster to nobody would be worse.
--
-- 2. invites.claimed_by references accounts(id) with NO cascade, so an account that ever claimed an
--    invite cannot be deleted while that row points at it -- the delete fails on a foreign key instead of
--    doing anything useful. Those rows are cleared first, including for the roster of a coach being
--    deleted, whose accounts are about to cascade away underneath them.
--
-- Everything else (client_state, coach_state, client_signals, feedback, form_checks) already cascades
-- from accounts, and accounts cascades from auth.users -- so deleting the auth row is what actually does
-- the work.

create or replace function public.delete_account(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_admin boolean;
  v_target_coach uuid;
  v_target_admin boolean;
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;

  -- Deleting yourself through this would take your own login with it and leave whatever you coach
  -- orphaned. Account closure, if it's ever wanted, is a different feature with different consequences.
  if p_target = v_caller then
    raise exception 'You cannot delete your own account here';
  end if;

  select a.is_platform_admin into v_caller_admin from public.accounts a where a.id = v_caller;
  select a.coach_id, a.is_platform_admin into v_target_coach, v_target_admin
    from public.accounts a where a.id = p_target;

  if not found then
    raise exception 'No such account';
  end if;

  -- A platform admin is the account that can restore everyone else. Removing one from inside the app is
  -- a lockout waiting to happen, so it stays a deliberate act in the SQL editor.
  if coalesce(v_target_admin, false) then
    raise exception 'Platform administrators cannot be deleted from the app';
  end if;

  -- The admin may delete anyone; a coach may delete only the people attached to them.
  if not (coalesce(v_caller_admin, false) or v_target_coach = v_caller) then
    raise exception 'Not authorized';
  end if;

  -- See note 2 above. Covers the target, invites they issued if they are a coach, and the invites claimed
  -- by their roster, which is about to cascade away.
  delete from public.invites
   where claimed_by = p_target
      or coach_id = p_target
      or claimed_by in (select a.id from public.accounts a where a.coach_id = p_target);

  -- Storage rows don't hang off accounts, so a cascade won't reach them. Same for the roster's clips when
  -- a coach goes.
  delete from storage.objects
   where bucket_id = 'form-checks'
     and (
       (storage.foldername(name))[1] = p_target::text
       or (storage.foldername(name))[1] in (select a.id::text from public.accounts a where a.coach_id = p_target)
     );

  -- Their conversation and their roster entry live inside the coach's jsonb blob, which no foreign key
  -- knows about. Left behind, the coach's app would keep showing a thread and a roster card for someone
  -- who no longer exists -- and would write them straight back on its next save.
  if v_target_coach is not null then
    update public.coach_state cs
       set data = jsonb_set(
             jsonb_set(
               cs.data,
               '{threads}',
               coalesce((select jsonb_agg(t) from jsonb_array_elements(coalesce(cs.data->'threads', '[]'::jsonb)) t
                          where t->>'clientId' <> p_target::text), '[]'::jsonb)
             ),
             '{clients}',
             coalesce((select jsonb_agg(c) from jsonb_array_elements(coalesce(cs.data->'clients', '[]'::jsonb)) c
                        where coalesce(c->>'accountId', '') <> p_target::text), '[]'::jsonb)
           ),
           updated_at = now()
     where cs.account_id = v_target_coach;
  end if;

  -- The login. accounts cascades from this, and everything else cascades from accounts.
  delete from auth.users u where u.id = p_target;
end;
$$;

grant execute on function public.delete_account(uuid) to authenticated;

-- The admin screen can only list coaches today, which is no use for deleting "anyone on the app".
create or replace function public.list_accounts_for_admin()
returns table(id uuid, display_name text, role text, created_at timestamptz, active boolean, coach_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  -- Aliased in the guard and in the body for the reason migration 0011 exists: the RETURNS TABLE columns
  -- are PL/pgSQL variables with the same names as the table's, and Postgres will not guess which is meant.
  return query
    select a.id, a.display_name, a.role, a.created_at, a.active, c.display_name as coach_name
      from public.accounts a
      left join public.accounts c on c.id = a.coach_id
     order by a.created_at desc;
end;
$$;

grant execute on function public.list_accounts_for_admin() to authenticated;
