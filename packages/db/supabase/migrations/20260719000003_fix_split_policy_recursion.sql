-- Fix: splits ↔ split_members policies referenced each other, which Postgres
-- rejects as infinite recursion the moment a returning select evaluates them
-- (caught by verify-rls: every splits operation 500'd).
--
-- The subqueries move into security-definer helpers, which run as the table
-- owner and so don't re-enter RLS. Both are stable, take auth.uid() from the
-- calling context, and pin an empty search_path against hijacking.

create or replace function public.is_split_organizer(split uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.splits s
    where s.id = split
      and s.organizer_id = (select auth.uid())
  );
$$;

create or replace function public.is_split_member(split uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.split_members m
    where m.split_id = split
      and m.member_user_id = (select auth.uid())
  );
$$;

drop policy splits_select_involved on public.splits;
create policy splits_select_involved on public.splits
  for select to authenticated
  using (
    organizer_id = (select auth.uid())
    or public.is_split_member(id)
  );

drop policy split_members_select_involved on public.split_members;
create policy split_members_select_involved on public.split_members
  for select to authenticated
  using (
    member_user_id = (select auth.uid())
    or public.is_split_organizer(split_id)
  );

drop policy split_members_insert_organizer on public.split_members;
create policy split_members_insert_organizer on public.split_members
  for insert to authenticated
  with check (public.is_split_organizer(split_id));
