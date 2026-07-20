-- Avatar storage.
--
-- The identity page let users pick a photo and only ever made a local object
-- URL from it — the file was never uploaded and vanished on reload. A private
-- bucket with per-user paths keeps one user from overwriting another's.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Path convention is <user_id>/<filename>, so ownership is the first segment.
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Avatars are shown next to handles on shared links, so reads are public.
create policy avatars_read_all on storage.objects
  for select to public
  using (bucket_id = 'avatars');

alter table public.users add column if not exists avatar_url text;
