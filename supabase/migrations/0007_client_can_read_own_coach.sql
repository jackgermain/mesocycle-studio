-- accounts_select (migration 0001) only ever let you see your own row, or your own clients' rows if
-- you're a coach. It never let a CLIENT see their COACH's row -- but the client app needs exactly that
-- (App.tsx's ClientProviders looks up the coach's display_name before it will render anything, the very
-- first thing that happens after signing in). RLS silently returns zero rows rather than an error, so
-- this wasn't a crash -- it was every real client's app hanging on a permanent blank screen with nothing
-- in the console to explain why. Reproduced live with a fresh test account.
create policy "accounts_select_own_coach" on public.accounts
  for select using (id in (select coach_id from public.accounts where id = auth.uid()));
