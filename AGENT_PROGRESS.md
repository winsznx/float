# AGENT_PROGRESS.md

Session-continuity log. Updated at every phase gate.

---

## Status

**Current phase:** 2 — Smart Contracts → **built + fully tested; deployment blocked ONLY on gas funding**
**Next phase:** 3 — SDK integration. Do not start without confirmation.

**⚠ To unblock deployment:** fund `0x88B59C52C90a257111C3E6Bb32F1983410E63A84` (throwaway deployer, key in `.env.local`) with ~0.01 Arbitrum Sepolia ETH, then run `npm run deploy:sepolia -w @float/contracts`. For Arbiscan verification set `ARBISCAN_API_KEY` (one free Etherscan v2 key covers Arbitrum) — deploy script verifies automatically, or rerun `npx hardhat verify` later.

| Phase | State |
|---|---|
| 0 · Foundation & frontend audit | ✅ complete |
| 1 · Database (Supabase + RLS) | ✅ complete |
| 2 · Contracts (LeashManager, PledgeVault) | 🟡 code+tests done; deploy awaits gas funding |
| 3 · SDK integration (Particle 7702, Magic, WalletConnect) | ⬜ not started |
| 4 · Backend API services | ⬜ not started |
| 5 · Event indexer | ⬜ not started |
| 6 · Wire frontend → backend | ⬜ not started |
| 7 · Testing & hardening | ⬜ not started |
| 8 · Deployment | ⬜ not started |
| 9 · Submission artifacts | ⬜ not started |

---

## Locked decisions (do not re-litigate)

| Decision | Detail |
|---|---|
| Auth model | Supabase Auth subject. `public.users.id references auth.users.id`; all RLS on `auth.uid()`; realtime rides `postgres_changes` which honors RLS. |
| Two Magic concerns are separate | (1) Magic auth → verify DID server-side → upsert Supabase auth user → mint session: standard, Phase 1's only dependency. (2) Magic wallet signs 7702 authorization for Particle UA: unverified, Phase 3, orthogonal. |
| Deadline semantics | End of selected day 23:59:59 in creator's local tz → unix seconds computed server-side at creation. `deadline_unix bigint` authoritative + `deadline_tz` (IANA) for display. Same pattern for leash `expiry_unix`/`expiry_tz`. |
| Balance is never a table | Unified/per-chain balance and send max are live Universal Account queries (Phase 3 service, Phase 4 endpoint). Not modeled in Postgres. |
| activity + notifications | Real tables created in Phase 1; populated Phase 4/5; realtime Phase 6. |
| Transport | tRPC for the authenticated app; small REST surface for token-scoped claim/settle/witness links. |
| PRD history rewrite | Skipped, accepted. PRD stays in git history; `internal/` gitignored going forward. |
| Region pairing | Supabase `eu-west-1` (matches user's other projects); Railway should deploy to `europe-west4`. |

---

## Phase 1 — done

**Supabase project:** `float`, ref `akdydruxfcilgsdxwyoi`, eu-west-1, created via authenticated CLI. Credentials in root `.env.local` (gitignored): URL, anon key, service-role key, project ref, DB password, DB URL.

**Sequence followed:** connectivity proven *before* schema was written (`supabase link` + remote `migration list`), then three migrations pushed to the real project:

1. `20260719000001_initial_schema` — all 10 tables: `users`, `sends`, `splits`, `split_members`, `leashes`, `leash_spends`, `pledges`, `pledge_events`, `activity`, `notifications`. Money as `numeric(20,6)` display units; chain-facing times as `*_unix bigint` + IANA tz; lowercase-hex address checks; `(tx_hash, log_index)` idempotency keys on indexer-written ledgers; `updated_at` triggers; capability-token columns (`share_link_token`, `claim_token`, `witness_token`) defaulting to `gen_random_bytes`.
2. `20260719000002_rls_and_realtime` — RLS enabled on all tables, every policy on `(select auth.uid())`; deny-by-default (activity/leash_spends/status transitions are service-role-only); anon read limited to public pledges + their events; realtime publication + `replica identity full` on `activity`, `notifications`, `split_members`, `leashes`, `leash_spends`.
3. `20260719000003_fix_split_policy_recursion` — see gotchas.

**Types:** generated from the live project into `packages/db/src/database.types.ts` (10 tables + 2 helper fns), exported as `@float/db`.

**RLS verification:** `packages/db/scripts/verify-rls.mjs` — creates two real auth users, exercises 29 allow/deny boundaries with their JWTs plus anon (cross-user reads/writes, forged inserts, self-settle attempt, indexer-only tables, public-pledge anon visibility, mark-notification-read), then deletes both users and confirms the cascade wiped everything. **29/29 passing.** Rerunnable: `npm run verify:rls -w @float/db`.

**No seed data.** The database contains zero rows after verification.

---

## Phase 2 — code + tests complete (deploy pending funding)

**Contracts** (`packages/contracts`, Solidity 0.8.24, OZ 5.6.1, Hardhat 2.28.6 + toolbox 5 — every API verified against node_modules before use):

- **LeashManager** — pull-based allowance, NOT escrow: funds stay with the owner; `spend` moves owner→recipient via `safeTransferFrom` inside cap/expiry/revocation checks. Custom errors; indexed events (`LeashCreated`/`LeashSpent` with remaining/`LeashRevoked` with unspent); ReentrancyGuard + effects-first; leash cap is independent of the ERC20 allowance (both tested).
- **PledgeVault** — escrow: stake pulled into vault at creation. `failureDestination` is a per-pledge param, `!= address(0)` the only guard (locked decision; dEaD passes, tested). `witness != pledger`. Witness resolves any time while unresolved — including after deadline (product notifies witness AT deadline). `claimExpired` permissionless only after `deadline + WITNESS_GRACE_PERIOD (72h)` so the witness can't be front-run at deadline+1s; race semantics (first resolution wins) tested.
- **Tests: 52/52** — every edge in the build prompt: over-limit/after-expiry/revoked/unauthorized/double-spend reverts, allowance-vs-cap, reentrancy via malicious token, witness-only enforcement, all three slash paths at the contract layer (success returns stake / failure fires to destination / expiry auto-slash), terminal resolution, isolation.
- **Deploy**: `scripts/deploy.ts` records address+block per network into `deployments/<network>.json` (indexer backfill start), auto-verifies when `ARBISCAN_API_KEY` set. Networks: arbitrumSepolia (421614, public RPC fallback), arbitrumOne (42161) config ready. Deployer `0x88B59C52C90a257111C3E6Bb32F1983410E63A84` generated, ZERO balance — faucets need a human.
- CI now compiles + tests contracts.

---

## Open questions

1. **Failure-destination addresses — RESOLVED for contracts** (per-pledge param, zero-guard only; burn = dEaD locked). Curated gitcoin/dao addresses remain a Phase 4 picker-config item: user supplies verified addresses, or a research prompt fetches them.
1a. **Deployer gas funding (blocks Phase 2 close-out).** Fund the address above; ~0.01 ETH is ample. `ARBISCAN_API_KEY` needed for verification.
2. **Magic + EIP-7702 signing path (Phase 3 gate).** Unverified; highest-risk unknown.
3. **`SUPABASE_JWT_SECRET`** — not fetchable via this CLI version; grab from dashboard → Project Settings → API → JWT Settings before Phase 3 (needed to mint Supabase sessions from Magic auth).
4. **Four missing frontend surfaces** (`/settle/:token`, leash claim, witness resolution, public pledge page) — net-new build in Phase 6.
5. **Farcaster resolution: Hubble vs Neynar** — PRD Open Question #3.
6. **Arbitrum RPC provider** — PRD Open Question #5.

---

## Gotchas discovered

- **Mutually-referencing RLS policies recurse.** `splits` select policy subqueried `split_members` and vice versa → Postgres "infinite recursion" → 500 on every splits operation. Fix: `security definer` helper functions (`is_split_organizer`, `is_split_member`) with pinned empty search_path, so policy subqueries don't re-enter RLS. Any future cross-table policy pair must use the same pattern.
- **PostgREST returns 201 with an *empty* body** when no `Prefer: return=representation` is sent — `res.json()` throws. Guard every parse.
- **Supabase CLI reads `SUPABASE_DB_PASSWORD`** from env for `link`/`db push` — no interactive prompt needed.
- **`supabase projects api-keys` does not expose the JWT secret** (open question 3).
- **`.next` must be cleared when switching between `next build` and `next dev`** — stale prod build makes dev 404 every route.
- **OG font fetches are network-dependent at build time** — retry/caching added in `5d7e697`; if builds go flaky, look there first.
- **Chrome headless `--window-size` enforces ~500px minimum width** — screenshot mobile via a sized iframe, not a narrow window.
- **Tailwind v4 has no `tailwind.config.js`** — tokens live in `@theme` in `globals.css`.
- OG images/favicon still render in Syne (pre-restyle font) — cosmetic, unfixed.

---

## Verification log

| Gate | lint | typecheck | build | extra |
|---|---|---|---|---|
| Phase 0 | ✅ | ✅ | ✅ | 4 consecutive clean builds after OG-font retry fix |
| Phase 1 | ✅ | ✅ | ✅ | migrations in lockstep local↔remote; RLS 29/29; DB left with zero rows |
| Phase 2 | ✅ | ✅ | ✅ | contracts 52/52; deploy pending gas funding |
