-- Real two-way messaging between a coach and one of her clients/friends. Threads still live inside the
-- coach's own coach_state (as before), but these two functions let the *client* side read their own
-- thread and append their own messages to it, without giving them any broader access to coach_state.
create or replace function public.get_my_thread()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_data jsonb;
  v_threads jsonb;
  v_result jsonb;
begin
  select coach_id into v_coach_id from public.accounts where id = auth.uid();
  if v_coach_id is null then
    return null;
  end if;

  select data into v_data from public.coach_state where account_id = v_coach_id;
  v_threads := coalesce(v_data->'threads', '[]'::jsonb);

  select elem into v_result
  from jsonb_array_elements(v_threads) elem
  where elem->>'clientId' = auth.uid()::text
  limit 1;

  return v_result;
end;
$$;

create or replace function public.send_client_message(p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_client_name text;
  v_data jsonb;
  v_threads jsonb;
  v_idx int;
  v_now text := to_char(now(), 'HH24:MI');
  v_new_bubble jsonb;
begin
  select coach_id, display_name into v_coach_id, v_client_name from public.accounts where id = auth.uid();
  if v_coach_id is null then
    raise exception 'No coach on file for this account';
  end if;

  v_new_bubble := jsonb_build_object('from', 'client', 'text', p_text, 'time', v_now);

  select data into v_data from public.coach_state where account_id = v_coach_id for update;
  v_threads := coalesce(v_data->'threads', '[]'::jsonb);

  select (i - 1) into v_idx
  from jsonb_array_elements(v_threads) with ordinality as t(elem, i)
  where elem->>'clientId' = auth.uid()::text
  limit 1;

  if v_idx is null then
    v_threads := jsonb_build_array(
      jsonb_build_object(
        'id', auth.uid()::text,
        'clientId', auth.uid()::text,
        'clientName', v_client_name,
        'context', '',
        'unread', true,
        'time', v_now,
        'preview', p_text,
        'bubbles', jsonb_build_array(v_new_bubble)
      )
    ) || v_threads;
  else
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'bubbles'], (v_threads->v_idx->'bubbles') || jsonb_build_array(v_new_bubble));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'unread'], 'true'::jsonb);
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'time'], to_jsonb(v_now));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'preview'], to_jsonb(p_text));
  end if;

  v_data := jsonb_set(coalesce(v_data, '{}'::jsonb), '{threads}', v_threads);
  update public.coach_state set data = v_data, updated_at = now() where account_id = v_coach_id;
end;
$$;

grant execute on function public.get_my_thread() to authenticated;
grant execute on function public.send_client_message(text) to authenticated;
