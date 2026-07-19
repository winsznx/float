-- FLOAT initial schema.
--
-- Model boundary (locked in AGENT_PROGRESS.md):
--   * On-chain state is authoritative for money and authority; these tables are
--     the social layer plus a read-cache the indexer keeps in sync.
--   * Balance is NOT modeled here — it is a live Universal Account query.
--   * users.id references auth.users.id: Supabase Auth is the session layer,
--     and every RLS policy keys on auth.uid().
--   * Chain-facing times (leash expiry, pledge deadline) are stored as the
--     exact unix seconds that go on-chain (bigint, authoritative) plus the
--     creator's IANA timezone for display. App-facing times are timestamptz.
--   * Money is numeric(20,6) in display units (USDC has 6 decimals); floats
--     never touch the database.

create extension if not exists pgcrypto;

-- Reused updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────── users ─────────────────────────────
-- One row per FLOAT identity, keyed to the Supabase auth user. address is the
-- Universal Account owner EOA (7702: same address before and after upgrade).
-- Nullable because an email-invited recipient can authenticate before their
-- wallet is provisioned; unique because the indexer maps address → user_id.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  address text unique
    check (address is null or (address = lower(address) and address ~ '^0x[0-9a-f]{40}$')),
  handle text
    check (handle is null or handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  email text,
  magic_id text,
  preferred_chain_id integer,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_handle_key on public.users (lower(handle)) where handle is not null;
create unique index users_magic_id_key on public.users (magic_id) where magic_id is not null;
create index users_email_idx on public.users (email) where email is not null;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ───────────────────────────── sends ─────────────────────────────
-- recipient_input is the raw string the sender typed (tim.eth, an email…);
-- the UI renders it verbatim. recipient_user_id links up when the recipient
-- is (or becomes, at claim time) a FLOAT user.
create table public.sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  recipient_user_id uuid references public.users (id) on delete set null,
  recipient_input text not null,
  recipient_type text not null check (recipient_type in ('ens', 'farcaster', 'email', 'address')),
  recipient_address text
    check (recipient_address is null or (recipient_address = lower(recipient_address) and recipient_address ~ '^0x[0-9a-f]{40}$')),
  amount numeric(20, 6) not null check (amount > 0),
  token text not null default 'USDC',
  source_chain_id integer,
  dest_chain_id integer,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'confirmed', 'failed')),
  tx_hash text,
  note text check (note is null or char_length(note) <= 140),
  claim_token text unique,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sends_sender_idx on public.sends (sender_id, created_at desc);
create index sends_recipient_idx on public.sends (recipient_user_id, created_at desc) where recipient_user_id is not null;
create unique index sends_tx_hash_key on public.sends (tx_hash) where tx_hash is not null;

create trigger sends_set_updated_at
  before update on public.sends
  for each row execute function public.set_updated_at();

-- ───────────────────────────── splits ─────────────────────────────
create table public.splits (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users (id) on delete cascade,
  name text check (name is null or char_length(name) <= 80),
  total_amount numeric(20, 6) not null check (total_amount > 0),
  token text not null default 'USDC',
  split_method text not null default 'equal' check (split_method in ('equal', 'custom', 'percentage')),
  status text not null default 'open' check (status in ('open', 'settled', 'cancelled')),
  share_link_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index splits_organizer_idx on public.splits (organizer_id, created_at desc);

create trigger splits_set_updated_at
  before update on public.splits
  for each row execute function public.set_updated_at();

-- member_ref is the raw entry (handle/email/address) — MemberStatus.input in
-- the frontend. settled/settle_tx_hash are written by the indexer or the
-- settle route, never by the member's client directly.
create table public.split_members (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits (id) on delete cascade,
  member_user_id uuid references public.users (id) on delete set null,
  member_ref text not null,
  share_amount numeric(20, 6) not null check (share_amount > 0),
  settled boolean not null default false,
  settle_tx_hash text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (split_id, member_ref)
);

create index split_members_split_idx on public.split_members (split_id);
create index split_members_user_idx on public.split_members (member_user_id) where member_user_id is not null;

-- ───────────────────────────── leashes ─────────────────────────────
-- onchain_leash_id is the bytes32 id LeashManager returns; spent is a cache
-- of on-chain state maintained by the indexer from LeashSpent events.
create table public.leashes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  beneficiary_user_id uuid references public.users (id) on delete set null,
  beneficiary_ref text not null,
  beneficiary_address text
    check (beneficiary_address is null or (beneficiary_address = lower(beneficiary_address) and beneficiary_address ~ '^0x[0-9a-f]{40}$')),
  token text not null default 'USDC',
  spend_limit numeric(20, 6) not null check (spend_limit > 0),
  spent numeric(20, 6) not null default 0 check (spent >= 0),
  contract_scope text not null default 'basic' check (contract_scope in ('basic', 'advanced')),
  allowed_contracts text[] not null default '{}',
  expiry_unix bigint,
  expiry_tz text,
  revoked boolean not null default false,
  onchain_leash_id text,
  tx_hash text,
  claim_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (spent <= spend_limit)
);

create index leashes_owner_idx on public.leashes (owner_id, created_at desc);
create index leashes_beneficiary_idx on public.leashes (beneficiary_user_id) where beneficiary_user_id is not null;
create unique index leashes_onchain_id_key on public.leashes (onchain_leash_id) where onchain_leash_id is not null;

create trigger leashes_set_updated_at
  before update on public.leashes
  for each row execute function public.set_updated_at();

-- Append-only ledger of spends, written by the indexer from LeashSpent events.
-- (tx_hash, log_index) is the idempotency key that makes backfill safe to
-- re-run over blocks it has already seen.
create table public.leash_spends (
  id uuid primary key default gen_random_uuid(),
  leash_id uuid not null references public.leashes (id) on delete cascade,
  amount numeric(20, 6) not null check (amount > 0),
  to_address text not null
    check (to_address = lower(to_address) and to_address ~ '^0x[0-9a-f]{40}$'),
  tx_hash text not null,
  log_index integer not null,
  block_number bigint,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index leash_spends_leash_idx on public.leash_spends (leash_id, created_at desc);

-- ───────────────────────────── pledges ─────────────────────────────
-- deadline_unix is the exact uint256 the contract stores — byte-for-byte what
-- the indexer reconciles against. failure_destination_address is nullable
-- until the destination address list is decided (open question 1).
create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  pledger_id uuid not null references public.users (id) on delete cascade,
  goal text not null check (char_length(goal) between 1 and 200),
  stake_amount numeric(20, 6) not null check (stake_amount > 0),
  token text not null default 'USDC',
  witness_user_id uuid references public.users (id) on delete set null,
  witness_ref text not null,
  witness_address text
    check (witness_address is null or (witness_address = lower(witness_address) and witness_address ~ '^0x[0-9a-f]{40}$')),
  failure_destination_id text not null check (failure_destination_id in ('gitcoin', 'dao', 'burn', 'custom')),
  failure_destination_label text not null,
  failure_destination_address text
    check (failure_destination_address is null or (failure_destination_address = lower(failure_destination_address) and failure_destination_address ~ '^0x[0-9a-f]{40}$')),
  deadline_unix bigint not null check (deadline_unix > 0),
  deadline_tz text not null,
  status text not null default 'locked' check (status in ('locked', 'succeeded', 'failed')),
  resolved_at timestamptz,
  onchain_pledge_id text,
  tx_hash text,
  is_public boolean not null default false,
  share_card_url text,
  witness_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pledges_pledger_idx on public.pledges (pledger_id, created_at desc);
create index pledges_witness_idx on public.pledges (witness_user_id) where witness_user_id is not null;
create index pledges_public_idx on public.pledges (created_at desc) where is_public;
create index pledges_deadline_idx on public.pledges (deadline_unix) where status = 'locked';
create unique index pledges_onchain_id_key on public.pledges (onchain_pledge_id) where onchain_pledge_id is not null;

create trigger pledges_set_updated_at
  before update on public.pledges
  for each row execute function public.set_updated_at();

-- Append-only pledge lifecycle, mirroring PledgeVault events. Same
-- (tx_hash, log_index) idempotency contract as leash_spends.
create table public.pledge_events (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references public.pledges (id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'witness_confirmed_success', 'witness_confirmed_failure',
    'expired_slashed', 'funds_released', 'slash_fired'
  )),
  tx_hash text,
  log_index integer,
  block_number bigint,
  created_at timestamptz not null default now()
);

create index pledge_events_pledge_idx on public.pledge_events (pledge_id, created_at desc);
create unique index pledge_events_tx_key on public.pledge_events (tx_hash, log_index)
  where tx_hash is not null and log_index is not null;

-- ───────────────────────────── activity ─────────────────────────────
-- Unified home-feed source. One row per user per event (a send produces a row
-- for the sender and, if known, one for the recipient). Written by services
-- and the indexer; clients only read their own.
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in (
    'send_sent', 'send_received',
    'split_created', 'split_member_settled', 'split_settled',
    'leash_created', 'leash_claimed', 'leash_spend', 'leash_revoked',
    'pledge_created', 'pledge_succeeded', 'pledge_failed'
  )),
  ref_type text not null check (ref_type in ('send', 'split', 'leash', 'pledge')),
  ref_id uuid not null,
  created_at timestamptz not null default now()
);

create index activity_user_idx on public.activity (user_id, created_at desc);

-- ─────────────────────────── notifications ───────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where not read;
