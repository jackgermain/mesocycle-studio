-- Close anonymous execute on every RPC except the one that needs it.
--
-- Doing this function by function has now cost four migrations (0018, 0019, 0021, this), each closing the
-- one hole that had just been noticed. A sweep is the only version of this that ends.
--
-- The rule, written out once more because it is the thing that keeps being missed: Supabase's project
-- bootstrap grants EXECUTE on everything in schema `public` to `anon`, `authenticated` and `service_role`
-- BY NAME, on top of Postgres's own default grant to PUBLIC. So every function here has been callable by
-- an unauthenticated visitor since the day it was written, unless something explicitly named `anon` in a
-- revoke. Almost nothing did.
--
-- Probed before writing this, with only the publishable key and no session. Six functions ran their
-- bodies for an anonymous caller: get_coach_templates, get_my_thread, my_coach_id, and the three admin
-- listers. None of them leaked anything -- each reads auth.uid() and returns empty, or raises
-- "Not authorized" -- so this is defence in depth rather than an open door. delete_account was the same:
-- it ran, and stopped on its own "Not signed in" guard.
--
-- Defence in depth is still worth having. An internal guard is one `select` away from being edited out by
-- someone who assumes the grant is doing the work, and a function that anon cannot execute at all cannot
-- be probed for timing, existence, or error-message differences either.

revoke execute on function public.bootstrap_coach(text) from anon, authenticated, public;
revoke execute on function public.bootstrap_coach_with_code(text, text) from anon, public;
revoke execute on function public.claim_invite(text, text) from anon, public;
revoke execute on function public.delete_account(uuid) from anon, public;
revoke execute on function public.get_coach_templates() from anon, public;
revoke execute on function public.get_my_thread() from anon, public;
revoke execute on function public.list_accounts_for_admin() from anon, public;
revoke execute on function public.list_coaches_for_admin() from anon, public;
revoke execute on function public.list_feedback_for_admin() from anon, public;
revoke execute on function public.my_coach_id() from anon, public;
revoke execute on function public.send_client_message(text) from anon, public;
revoke execute on function public.set_coach_active_as_admin(uuid, boolean) from anon, public;

-- Re-granted to the role that should have them. bootstrap_coach is deliberately absent: it is the
-- un-coded coach signup function that 0018 set out to retire, and nothing calls it any more.
grant execute on function public.bootstrap_coach_with_code(text, text) to authenticated;
grant execute on function public.claim_invite(text, text) to authenticated;
grant execute on function public.delete_account(uuid) to authenticated;
grant execute on function public.get_coach_templates() to authenticated;
grant execute on function public.get_my_thread() to authenticated;
grant execute on function public.list_accounts_for_admin() to authenticated;
grant execute on function public.list_coaches_for_admin() to authenticated;
grant execute on function public.list_feedback_for_admin() to authenticated;
grant execute on function public.my_coach_id() to authenticated;
grant execute on function public.send_client_message(text) to authenticated;
grant execute on function public.set_coach_active_as_admin(uuid, boolean) to authenticated;

-- get_invite keeps anon. It is the safe-fields-only preview an invited person sees on the invite screen
-- BEFORE they have signed in, so revoking it here would break the first screen of every invite link.
grant execute on function public.get_invite(text) to anon, authenticated;
