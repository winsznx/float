-- FLOAT row-level security + realtime.
--
-- Model: every client-visible policy keys on auth.uid(). Deny is the default —
-- RLS is enabled on all tables and anything without a policy (activity inserts,
-- leash_spends, status transitions…) is service-role-only, written by the API
-- or the indexer. Share/claim/witness links never loosen these policies; they
-- go through scoped token-based server routes running with the service role.

alter table public.users enable row level security;
alter table public.sends enable row level security;
alter table public.splits enable row level security;
alter table public.split_members enable row level security;
alter table public.leashes enable row level security;
alter table public.leash_spends enable row level security;
alter table public.pledges enable row level security;
alter table public.pledge_events enable row level security;
alter table public.activity enable row level security;
alter table public.notifications enable row level security;

-- ───────────────────────────── users ─────────────────────────────
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_insert_own on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ───────────────────────────── sends ─────────────────────────────
-- Both sides of a send can read it. Only the sender creates it. Status and
-- tx_hash transitions are server-side (service role) — no client update.
create policy sends_select_party on public.sends
  for select to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_user_id = (select auth.uid())
  );

create policy sends_insert_own on public.sends
  for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- ───────────────────────────── splits ─────────────────────────────
create policy splits_select_involved on public.splits
  for select to authenticated
  using (
    organizer_id = (select auth.uid())
    or exists (
      select 1 from public.split_members m
      where m.split_id = splits.id
        and m.member_user_id = (select auth.uid())
    )
  );

create policy splits_insert_own on public.splits
  for insert to authenticated
  with check (organizer_id = (select auth.uid()));

create policy splits_update_organizer on public.splits
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

-- ─────────────────────────── split_members ───────────────────────────
-- Settlement (settled, settle_tx_hash) is service-role-only: a member settles
-- through the token-scoped route or on-chain, never by flipping their own row.
create policy split_members_select_involved on public.split_members
  for select to authenticated
  using (
    member_user_id = (select auth.uid())
    or exists (
      select 1 from public.splits s
      where s.id = split_members.split_id
        and s.organizer_id = (select auth.uid())
    )
  );

create policy split_members_insert_organizer on public.split_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.splits s
      where s.id = split_members.split_id
        and s.organizer_id = (select auth.uid())
    )
  );

-- ───────────────────────────── leashes ─────────────────────────────
-- spent is indexer-maintained; the owner's client may update only its own
-- rows (revoke intent), and can never touch another owner's leash.
create policy leashes_select_party on public.leashes
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or beneficiary_user_id = (select auth.uid())
  );

create policy leashes_insert_own on public.leashes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy leashes_update_owner on public.leashes
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ─────────────────────────── leash_spends ───────────────────────────
-- Read-only for both parties; writes come from the indexer (service role).
create policy leash_spends_select_party on public.leash_spends
  for select to authenticated
  using (
    exists (
      select 1 from public.leashes l
      where l.id = leash_spends.leash_id
        and (l.owner_id = (select auth.uid()) or l.beneficiary_user_id = (select auth.uid()))
    )
  );

-- ───────────────────────────── pledges ─────────────────────────────
-- Public pledges are the accountability board: readable by any authenticated
-- user and by anon (share cards render without a session). Resolution is
-- server-side only — the witness never updates the row directly.
create policy pledges_select_visible on public.pledges
  for select to authenticated
  using (
    is_public
    or pledger_id = (select auth.uid())
    or witness_user_id = (select auth.uid())
  );

create policy pledges_select_public_anon on public.pledges
  for select to anon
  using (is_public);

create policy pledges_insert_own on public.pledges
  for insert to authenticated
  with check (pledger_id = (select auth.uid()));

-- ─────────────────────────── pledge_events ───────────────────────────
-- Visibility follows the parent pledge. anon sees events of public pledges.
create policy pledge_events_select_visible on public.pledge_events
  for select to authenticated
  using (
    exists (
      select 1 from public.pledges p
      where p.id = pledge_events.pledge_id
        and (
          p.is_public
          or p.pledger_id = (select auth.uid())
          or p.witness_user_id = (select auth.uid())
        )
    )
  );

create policy pledge_events_select_public_anon on public.pledge_events
  for select to anon
  using (
    exists (
      select 1 from public.pledges p
      where p.id = pledge_events.pledge_id and p.is_public
    )
  );

-- ───────────────────────────── activity ─────────────────────────────
-- Own feed only. Inserts come from services and the indexer.
create policy activity_select_own on public.activity
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────── notifications ───────────────────────────
-- Own rows only; the single client write is marking as read.
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ───────────────────────────── realtime ─────────────────────────────
-- postgres_changes honors RLS for authenticated subscribers, so adding these
-- tables to the publication is all the plumbing the live surfaces need:
-- activity feed, split settlement status, live leash spend, notifications.
-- replica identity full so update/delete payloads carry enough columns for
-- RLS checks and old-record diffs.
alter table public.activity replica identity full;
alter table public.notifications replica identity full;
alter table public.split_members replica identity full;
alter table public.leashes replica identity full;
alter table public.leash_spends replica identity full;

alter publication supabase_realtime add table
  public.activity,
  public.notifications,
  public.split_members,
  public.leashes,
  public.leash_spends;
