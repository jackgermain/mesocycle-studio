-- A directory of coaches for the platform owner, and coaches who can bring on other coaches.
--
-- Two changes, and the second undoes a restriction 0020 added three hours earlier -- deliberately, at
-- Jack's call. 0020 limited coach invites to the platform owner, reasoning that a coach handing out coach
-- accounts is the same privilege escalation 0018 closed by another door. That is still true, and it is
-- also the growth mechanism the business wants: coaches recruiting coaches is how the roster of coaches
-- grows without the owner in the loop for every one.
--
-- The tradeoff, stated plainly so it is not rediscovered later: after this, anyone holding a coach
-- account can mint unlimited coach accounts, and there is no cap, no approval and no audit beyond the
-- issuer id already stored on the invite. The directory below is what makes that visible -- every coach,
-- however they got here, with the size of their roster, on one screen the owner can actually look at.

drop policy if exists "invites_insert_own" on public.invites;
create policy "invites_insert_own" on public.invites
  for insert with check (
    coach_id = auth.uid()
    and exists (select 1 from public.accounts where id = auth.uid() and role = 'coach')
  );

-- Now returns roster size alongside each coach. Counting in SQL rather than in the app because the app
-- has no way to read another coach's roster at all -- that isolation is the whole point of the schema,
-- and a security definer function is the only thing that can see across it.
--
-- Still `is_platform_admin` only, and still enforced inside the function rather than by the grant, so
-- revoking the grant later cannot silently open it.
drop function if exists public.list_coaches_for_admin();
create or replace function public.list_coaches_for_admin()
returns table(
  id uuid,
  display_name text,
  created_at timestamptz,
  active boolean,
  client_count bigint,
  friend_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  return query
    select
      a.id,
      a.display_name,
      a.created_at,
      a.active,
      (select count(*) from public.accounts c where c.coach_id = a.id and c.role = 'client'),
      (select count(*) from public.accounts f where f.coach_id = a.id and f.role = 'friend')
    from public.accounts a
    where a.role = 'coach'
    order by a.created_at desc;
end;
$$;

revoke execute on function public.list_coaches_for_admin() from anon, public;
grant execute on function public.list_coaches_for_admin() to authenticated;
