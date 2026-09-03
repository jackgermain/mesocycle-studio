-- client_state and coach_state have only ever had UPDATE policies. Rows were created exclusively by the
-- SECURITY DEFINER bootstrap_coach()/claim_invite() functions, which bypass RLS -- but every ongoing save
-- the app does is a plain .upsert() (INSERT ... ON CONFLICT DO UPDATE), and Postgres RLS checks the INSERT
-- policy for that statement shape regardless of whether the row already exists. With no INSERT policy,
-- every such upsert has been silently failing (42501), so none of the app's own writes were ever actually
-- persisting -- only rows edited directly via SQL stuck.
create policy "coach_state_insert" on public.coach_state
  for insert with check (account_id = auth.uid());

create policy "client_state_insert" on public.client_state
  for insert with check (
    account_id = auth.uid()
    or account_id in (select id from public.accounts where coach_id = auth.uid())
  );
