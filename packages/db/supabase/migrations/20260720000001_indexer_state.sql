-- Indexer cursor.
--
-- Without a persisted cursor a restart either re-scans from the deployment
-- block every time or, worse, skips everything that happened while the worker
-- was down. One row per chain.
--
-- Service-role only: no user has any business reading or writing it, and it is
-- deliberately left with no policy so RLS denies everyone else by default.

create table public.indexer_state (
  id text primary key,
  last_block bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.indexer_state enable row level security;

comment on table public.indexer_state is
  'Last block processed per chain. Written only by the indexer worker via the service role.';
