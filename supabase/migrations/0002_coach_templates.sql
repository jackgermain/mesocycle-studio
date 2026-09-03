-- A friend/family account needs to browse their own coach's saved templates (to clone one), but must
-- never see the rest of her coach_state (other clients, flags, messages). Rather than relaxing RLS on
-- coach_state itself, expose just the template subset through a narrow function.
create or replace function public.get_coach_templates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_programs jsonb;
begin
  select coalesce(
    (select id from public.accounts where id = auth.uid() and role = 'coach'),
    (select coach_id from public.accounts where id = auth.uid())
  ) into v_coach_id;

  if v_coach_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(cs.data->'programs', '[]'::jsonb) into v_programs
  from public.coach_state cs
  where cs.account_id = v_coach_id;

  return coalesce(
    (select jsonb_agg(p) from jsonb_array_elements(v_programs) p where (p->>'isTemplate')::boolean is true),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_coach_templates() to authenticated;
