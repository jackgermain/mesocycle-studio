-- list_coaches_for_admin() failed with 42702 "column reference \"id\" is ambiguous" for every caller.
-- Its RETURNS TABLE(id uuid, ...) signature declares a PL/pgSQL OUT variable named `id`, and the
-- authorization guard's `where id = auth.uid()` didn't say which `id` it meant -- the OUT variable or
-- accounts.id. Postgres refuses to guess. Aliasing the table in the guard resolves it.
--
-- Worth noting the guard is the *first* statement in the function, so this fired before the
-- is_platform_admin check ever ran -- it broke the screen for everyone rather than failing closed in an
-- interesting way. The authorization behaviour itself was never in question.
create or replace function public.list_coaches_for_admin()
returns table(id uuid, display_name text, created_at timestamptz, active boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  return query select a.id, a.display_name, a.created_at, a.active from public.accounts a where a.role = 'coach' order by a.created_at desc;
end;
$$;
