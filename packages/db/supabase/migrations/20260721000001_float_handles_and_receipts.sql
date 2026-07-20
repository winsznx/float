-- FLOAT handles as a first-class recipient type, and shareable receipts.
--
-- A send to "@winsznx" resolved through Farcaster and delivered $1 to that
-- person's Farcaster-verified address instead of to the FLOAT account holding
-- the handle. FLOAT handles were never resolvable at all: identity resolution
-- fell through to Farcaster for anything that wasn't an address, an email, or
-- an ENS name. The app's own namespace has to win inside its own app.

alter table public.sends
  drop constraint if exists sends_recipient_type_check;

alter table public.sends
  add constraint sends_recipient_type_check
  check (recipient_type in ('float', 'ens', 'farcaster', 'email', 'address'));

-- Receipts are shared by link, so they cannot key on the row id: ids travel
-- through API responses and logs, and a shared receipt should be revocable
-- without touching the send itself. Minted by the database so a receipt can
-- never exist without one.
alter table public.sends
  add column if not exists share_token text unique
  not null default replace(gen_random_uuid()::text, '-', '');

create index if not exists sends_share_token_idx on public.sends (share_token);
