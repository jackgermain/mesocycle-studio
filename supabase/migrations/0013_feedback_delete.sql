-- Feedback had no way out: insert and select only, so the platform owner's inbox could only ever grow.
-- Deleting a note is the "I've dealt with this" action, which also means the count of remaining notes is
-- exactly the count of unhandled ones -- no separate read/unread flag needed to badge it.
create policy "feedback_delete_by_admin" on public.feedback
  for delete using (
    exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin)
  );
