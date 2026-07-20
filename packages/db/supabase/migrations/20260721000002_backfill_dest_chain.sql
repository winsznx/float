-- Correct dest_chain_id on sends written before the destination was real.
--
-- dest_chain_id used to be derived from the recipient's preferred chain — a
-- preference createTransferTransaction never honoured, because it was hardcoded
-- to Arbitrum. Every row from that period therefore names whichever chain the
-- recipient happened to hold value on, while the money went to Arbitrum.
--
-- Scoped to rows that predate the fix. New rows carry what the route reported
-- and must not be touched: a later transfer that genuinely settles on Base is
-- correct at 8453 and would be corrupted by a blanket update.
update public.sends
set dest_chain_id = 42161
where tx_hash is not null
  and dest_chain_id is not null
  and dest_chain_id <> 42161
  and created_at < '2026-07-21T07:00:00Z';
