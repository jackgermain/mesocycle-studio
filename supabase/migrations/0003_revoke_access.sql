-- Lets a coach revoke a client/friend's access without deleting their history.
alter table public.accounts add column active boolean not null default true;

-- The coach can update her own clients' rows (used to flip `active`).
create policy "accounts_update_by_coach" on public.accounts
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
