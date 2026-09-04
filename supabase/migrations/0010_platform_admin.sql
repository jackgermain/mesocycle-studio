-- A platform-owner capability, entirely separate from the coach/client/friend roles that structure actual
-- coaching relationships. As more independent coaches sign up (see 0009_allow_multiple_coaches.sql), the
-- app owner needs a way to shut off a coach's access if needed -- without being able to see their roster,
-- clients, or any of their data. Deliberately narrow: two security-definer functions that do exactly one
-- thing each (list coach accounts by name/status only, flip `active`), not a broad grant or admin login.
alter table public.accounts add column is_platform_admin boolean not null default false;

create or replace function public.list_coaches_for_admin()
returns table(id uuid, display_name text, created_at timestamptz, active boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts where id = auth.uid() and is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  return query select a.id, a.display_name, a.created_at, a.active from public.accounts a where a.role = 'coach' order by a.created_at desc;
end;
$$;

create or replace function public.set_coach_active_as_admin(p_coach_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts where id = auth.uid() and is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from public.accounts where id = p_coach_id and role = 'coach') then
    raise exception 'Not a coach account';
  end if;
  update public.accounts set active = p_active where id = p_coach_id;
end;
$$;

grant execute on function public.list_coaches_for_admin() to authenticated;
grant execute on function public.set_coach_active_as_admin(uuid, boolean) to authenticated;
