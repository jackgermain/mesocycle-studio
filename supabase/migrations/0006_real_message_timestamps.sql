-- send_client_message stored only "HH24:MI" (clock time, no date) for both the bubble and the thread's
-- own time field -- fine for a same-day demo, but a message from yesterday would render with today's
-- implied date, or the client app just showed the same coach-side "now" hardcoded literal (fixed
-- separately in src/coach/store.tsx). Store a real ISO timestamp instead so the UI can format it
-- correctly relative to when it's actually viewed, whenever that is.
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
  v_now_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_new_bubble jsonb;
begin
  select coach_id, display_name into v_coach_id, v_client_name from public.accounts where id = auth.uid();
  if v_coach_id is null then
    raise exception 'No coach on file for this account';
  end if;

  v_new_bubble := jsonb_build_object('from', 'client', 'text', p_text, 'time', v_now_iso);

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
        'time', v_now_iso,
        'preview', p_text,
        'bubbles', jsonb_build_array(v_new_bubble)
      )
    ) || v_threads;
  else
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'bubbles'], (v_threads->v_idx->'bubbles') || jsonb_build_array(v_new_bubble));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'unread'], 'true'::jsonb);
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'time'], to_jsonb(v_now_iso));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'preview'], to_jsonb(p_text));
  end if;

  v_data := jsonb_set(coalesce(v_data, '{}'::jsonb), '{threads}', v_threads);
  update public.coach_state set data = v_data, updated_at = now() where account_id = v_coach_id;
end;
$$;
