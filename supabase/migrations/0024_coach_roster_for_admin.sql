-- Let the platform owner look at one coach's roster.
--
-- 0023 gave the owner a directory of coaches with roster sizes. A count answers "is this coach using the
-- app" and nothing else -- it cannot tell you whether the eight people on a roster signed up last week
-- and never came back.
--
-- Every coach's clients are invisible to every other account by design, and that stays true: this is not
-- a relaxed RLS policy, it is one narrow security definer function that returns account-level facts and
-- nothing else. No programs, no logged sessions, no weigh-ins, no messages, no nutrition. The owner can
-- see WHO is on a roster and whether they ever finished signing up. They cannot read anybody's training.
--
-- That line is deliberate. A coach's clients are the coach's business, and an owner who can read them has
-- something to explain to every coach they are trying to sell this to.

create or replace function public.get_coach_roster_for_admin(p_coach_id uuid)
returns table(
  id uuid,
  display_name text,
  role text,
  active boolean,
  created_at timestamptz,
  claimed boolean
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
      a.role,
      a.active,
      a.created_at,
      -- Whether this person ever actually claimed an invite, as opposed to being a roster placeholder the
      -- coach typed in and never sent. The difference is the whole point of looking: a roster of ten that
      -- is nine placeholders is not a roster of ten.
      exists (select 1 from public.invites i where i.claimed_by = a.id)
    from public.accounts a
    where a.coach_id = p_coach_id
      and a.role in ('client', 'friend')
    order by a.created_at desc;
end;
$$;

revoke execute on function public.get_coach_roster_for_admin(uuid) from anon, public;
grant execute on function public.get_coach_roster_for_admin(uuid) to authenticated;
