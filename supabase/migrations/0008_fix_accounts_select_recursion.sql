-- 0007's accounts_select_own_coach policy referenced public.accounts from inside its own USING clause
-- (a plain subquery on the same table the policy protects), which re-triggers RLS evaluation on itself --
-- Postgres correctly detects that as infinite recursion and hard-fails every query against accounts for
-- every user, not just the new policy's own matches. The fix is the standard one: do the self-lookup
-- inside a SECURITY DEFINER function, which runs with elevated privileges and so doesn't re-trigger RLS,
-- breaking the cycle.
create or replace function public.my_coach_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select coach_id from public.accounts where id = auth.uid()
$$;

grant execute on function public.my_coach_id() to authenticated;

drop policy if exists "accounts_select_own_coach" on public.accounts;
create policy "accounts_select_own_coach" on public.accounts
  for select using (id = public.my_coach_id());
