# AGENT_PROGRESS.md

Session-continuity log. Updated at every phase gate.

---

## Status

**Current phase:** Hardening pass, Phase C (Cloudflare migration) — ✅ deployed and proven, awaiting gate confirmation
**Next phase:** B — wire every dead surface (one item, settle activity rows, already landed with the port). Do not continue without confirmation.

## Hardening Phase C — 2026-08-17 (pulled ahead of B: Railway trial expired, production had been dark since Aug 13)

Everything hosts on Cloudflare Workers now; Railway is fully retired and no
tracked file references it.

- **float-api** — Fastify → Hono, one worker: /trpc (fetch adapter via
  @hono/trpc-server), /link, /particle, /delegate, same paths and budgets.
  Rate limits and login nonces are SQLite Durable Objects (per-colo ratelimit
  binding isn't accurate enough for the delegate route, which spends sponsor
  gas; in-memory nonces don't survive isolate churn). mintSession drops the
  listUsers scan for generateLink's returned user. Live:
  https://float-api.timjosh507.workers.dev — 39/39 verify checks against the
  deployment, plus a real corroborated settle ($0.07,
  `0x4d5db420…cf92f8`) and a real sponsored delegation from a fresh zero-ETH
  EOA (`0x66666b3e…fa691`, type eip7702, code = 0xef0100+impl, replay no-op).
- **float-indexer** — DO alarm every 10s + 1-min cron watchdog; scan engine
  shared with the node entry (src/core.ts); cursor stays in indexer_state.
  Closed the 1.47M-block gap on deploy (the cold-start backfill rehearsal)
  and re-linked the keeper subject from chain after a cursor rewind.
- **float-web** — Next bumped 16.2.10 → 16.2.12 (adapter floor 16.2.11 is a
  security release: 4 high-severity fixes), @opennextjs/cloudflare 1.20.2.
  Live: https://float-web.timjosh507.workers.dev — all sessionless surfaces
  load with real data (witness, leash claim, receipt, public pledge).
- **Compat verified empirically in workerd before porting:** Magic admin
  (validate/getIssuer crypto path), Particle UA SDK (axios), Supabase, viem,
  node:crypto, process.env-from-bindings.
- **Keeper subject** (Phase D): pledge `0063f654-4abd-4847-9091-ef81fb206ecf`
  on-chain id `0xf936e524…`, deadline 1787011199 (Aug 17 23:59:59 UTC),
  grace ends 1787270399 (Aug 20 23:59:59 UTC), tracked by the live indexer.
- **Verify-script hygiene:** the suite uses a throwaway address per run and
  the settle proof deletes only its own splits — the old shared identity's
  cascade had deleted the real linked rows (restored + re-linked from chain).

**Human steps outstanding:** add https://float-web.timjosh507.workers.dev to
Magic's allowed origins (dashboard) or browser logins fail; browser E2E with
a real Magic OTP; custom domain decision (workers.dev URLs carry the build
for now).

## Hardening Phase A — 2026-08-17

Contracts untouched. All proofs ran against the production database and real
Arbitrum One mainnet, with the fixed API running locally (the Railway deploy
still carries pre-fix code; see the gate note).

- **A1 equal-split validation** — server now validates per method in whole
  cents: equal expects `floor(total/(N+1))` a head (organizer counts as a
  head), percentage/custom keep the full-total tolerance
  (`apps/api/src/routers/split.ts`). Proof: verify-api 39/39 including the
  $90/3 regression; live $0.06 equal split accepted
  (`apps/api/scripts/prove-settle-verification.mjs`).
- **A2 settle verification** — `POST /link/settle/:token` records only what a
  USDC Transfer-log sweep to the organizer corroborates
  (`apps/api/src/lib/settle-verify.ts`), stores the found chain hash, one
  hash settles at most one share, replays are no-ops, uncorroborated → 409
  retryable. Client retries the record phase on a minutes-scale schedule
  (`apps/web/src/lib/settle.ts`). `send.attachTxHash` deleted (no caller).
  Proof: real $0.02 USDC transfer `0x51931445…5623f` corroborated; garbage
  hash refused. Sweeps need range-capable logs RPCs (`*_LOGS_RPC_URL`,
  public fallbacks — Alchemy caps getLogs at 10 blocks).
- **A3 chain linkage** — confirmed at runtime that Particle transactionIds do
  NOT match chain tx hashes (production leash never linked; on-chain hashes
  differ). Indexer now links `LeashCreated`/`PledgeCreated` by event args
  (owner/pledger + amounts + exact unix expiry/deadline + destination),
  oldest-unlinked-first, and backfills the real chain hash
  (`packages/indexer/src/handlers.ts`). Proof: real leash
  `0xe07faaa0…d737` + real pledge `0x672a3be4…715e` both auto-linked
  (`apps/api/scripts/prove-chain-linkage.mjs`). That pledge (id
  `fb978070-455f-4dae-ae07-24b9139121f7`, deadline 1787011199, grace ends
  1787270399) is left to expire as the Phase D keeper subject.
- **A4 destination picker** — picker filters to server-configured
  destinations; custom address gets inline viem `isAddress` + zero-address
  validation in the page and a hard guard before the chain call; stale TODO
  removed.

**Found while proving:** the Railway indexer's cursor froze at block
494085696 on 2026-08-13 (service down). The gap holds zero contract events
(Arbiscan-verified), so no data was missed; the local proof run advanced the
cursor. The deployed indexer also runs the old hash-matching build.

**Deployed (Arbitrum Sepolia, 421614):**
- LeashManager `0x85eF03e9a1Fd2866644132E41c622F4f8d9ae588` (block 289239169) — [verified](https://sepolia.arbiscan.io/address/0x85eF03e9a1Fd2866644132E41c622F4f8d9ae588#code)
- PledgeVault `0x63139db97859661CfDe4e6a0Af55Ab368a5b4091` (block 289239192) — [verified](https://sepolia.arbiscan.io/address/0x63139db97859661CfDe4e6a0Af55Ab368a5b4091#code)
- Addresses + deploy blocks in `packages/contracts/deployments/arbitrumSepolia.json` and `.env.local` (`INDEXER_START_BLOCK=289239169`). Live reads confirmed post-deploy.

| Phase | State |
|---|---|
| 0 · Foundation & frontend audit | ✅ complete |
| 1 · Database (Supabase + RLS) | ✅ complete |
| 2 · Contracts (LeashManager, PledgeVault) | ✅ complete — deployed + Arbiscan-verified |
| 3 · SDK integration (Particle 7702, Magic, WalletConnect) | 🟡 verified + modules written; proofs need keys + mainnet decision |
| 4 · Backend API services | ⬜ not started |
| 5 · Event indexer | ⬜ not started |
| 6 · Wire frontend → backend | ⬜ not started |
| 7 · Testing & hardening | ⬜ not started |
| 8 · Deployment | ⬜ not started |
| 9 · Submission artifacts | ⬜ not started |


## MAINNET — Arbitrum One (42161)

- **LeashManager** `0x63139db97859661CfDe4e6a0Af55Ab368a5b4091` (block 485873022) — [verified](https://arbiscan.io/address/0x63139db97859661CfDe4e6a0Af55Ab368a5b4091#code)
- **PledgeVault** `0x925853a320914126DcFa0a3875D2722EeC60Fc9d` (block 485873032) — [verified](https://arbiscan.io/address/0x925853a320914126DcFa0a3875D2722EeC60Fc9d#code)
- Deploy cost: 0.0000278 ETH (~$0.08). `INDEXER_START_BLOCK=485873022`.

**Why mainnet was mandatory, not optional:** the Particle UA SDK's
assertSupportedChain rejects every testnet. `createUniversalTransaction({chainId: 421614})`
throws "Chain 421614 is not supported" while 42161 is accepted. Leash and
Pledge are unreachable through the Universal Account unless the contracts are
on Arbitrum One. The Sepolia deployment remains as a reference but no UA flow
can touch it.

**Correction to the pitch:** the pledge slash is a same-chain ERC20
`safeTransfer` to failureDestination (PledgeVault.sol:130), NOT a cross-chain
transfer. The cross-chain property is on the *funding* side — the UA sources
the stake from wherever the user holds value. Do not claim a cross-chain slash.

**Not an on-chain guarantee:** LeashManager scopes by beneficiary, token, cap
and expiry only. `createLeash` takes 4 params — there is no allowedContracts
argument. Per-contract scoping is stored in Postgres for the UI and must not be
presented as chain-enforced.

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

## Phase 3 — SDK surfaces verified (installed types + official docs)

**Resolved: the Magic ↔ EIP-7702 path exists and is first-class.** `magic.wallet.sign7702Authorization({contractAddress, chainId, nonce?})` → `{v, r, s, signature?}` and `send7702Transaction({authorizationList})` — verified in installed magic-sdk@33.9.0 types AND in Magic's official docs (available since 33.4.0). Particle's docs explicitly list Magic as a verified 7702 provider with this exact call, plus a demo repo (soos3d/ua-7702-magic-demo). `chainId: 0` = universal cross-chain authorization. The documented flow: sign7702Authorization for the auth tuple (raw digest) + standard personal_sign for the UA rootHash — two separate signatures, never interchangeable.

**⚠ MATERIAL FINDING: Particle Universal Accounts v2 is mainnet-only.** The SDK's `assertSupportedChain` gates on exactly [Ethereum, BSC, Base, Arbitrum One, XLayer, Solana] — zero testnet ids in the bundle. Official docs confirm: the 2024 testnet program was retired at mainnet launch; the FAQ states UAs must hold real Primary Assets; no sandbox/fake-funds mode exists. `UNIVERSALX_RPC_URL_STAGING` is undocumented (likely internal pre-prod for the same mainnets — unconfirmed). **The build prompt's "cross-chain USDC transfer on testnet" is impossible with this SDK.** Options at the gate: (a) mainnet proof with small real value (~$5–10 USDC through the UA on Arbitrum One), (b) keep contracts on Sepolia and prove the UA flow on mainnet — the two proofs are independent.

**Modules written** (`apps/web/src/lib/chain/`, typed strictly against installed .d.ts):
- `config.ts` — env access, throws on missing keys (no silent mock fallback)
- `magic.ts` — lazy browser singleton: loginWithEmailOTP, getIdToken (DID for server verification), getWalletAddress (via wallets.ethereum — publicAddress moved in v33), sign7702Authorization
- `universal-account.ts` — UA construction (useEIP7702: true), `getUnifiedBalance()` (THE balance seam: total + per-chain + tokens from getPrimaryAssets), `createUsdcTransfer()` (cross-chain → USDC on Arbitrum One), `toParticleAuthorization()` (Magic v/r/s → Particle {userOpHash, signature}, v normalized to yParity)
- `wagmi.ts` — wagmi@2.19.5 config (pinned v2 per stack; v3 is out, not adopted), injected + optional WalletConnect connector

**Blocked on user:**
1. Particle dashboard keys (PROJECT_ID / CLIENT_KEY / APP_ID)
2. Magic keys (publishable + secret)
3. WalletConnect project id (optional — injected wallets work without)
4. SUPABASE_JWT_SECRET (dashboard; management API doesn't expose it via CLI token)
5. The mainnet decision for proof 1

---

## Open questions

1. **Failure-destination addresses — RESOLVED for contracts** (per-pledge param, zero-guard only; burn = dEaD locked). Curated gitcoin/dao addresses remain a Phase 4 picker-config item: user supplies verified addresses, or a research prompt fetches them.
2. **Magic + EIP-7702 signing path — RESOLVED.** First-class SDK method, doc-verified, Particle-listed. See Phase 3 section.
2a. **UA proofs need keys + mainnet decision** — see Phase 3 "Blocked on user" list.
3. **`SUPABASE_JWT_SECRET`** — not fetchable via this CLI version; grab from dashboard → Project Settings → API → JWT Settings before Phase 3 (needed to mint Supabase sessions from Magic auth).
4. **Four missing frontend surfaces** (`/settle/:token`, leash claim, witness resolution, public pledge page) — net-new build in Phase 6.
5. **Farcaster resolution: Hubble vs Neynar** — PRD Open Question #3.
6. **Arbitrum RPC provider** — PRD Open Question #5.

---

## Gotchas discovered

- **Particle UA SDK ships types its `exports` map hides** — `dist/index.d.ts` exists but there's no `types` condition, so `moduleResolution: bundler` can't resolve it. Fixed with a tsconfig `paths` entry pointing at the .d.ts directly.
- **magic-sdk v33 moved the address**: `MagicUserMetadata.publicAddress` is gone; use `info.wallets?.ethereum?.publicAddress`.
- **wagmi is on v3 now** — stack pin says v2; installed wagmi@2.19.5 deliberately.

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
| Phase 2 | ✅ | ✅ | ✅ | contracts 52/52; deployed + verified on Arbitrum Sepolia; live reads confirmed |
| Phase 3 (partial) | ✅ | ✅ | ✅ | SDK surfaces verified against installed types + official docs; proofs pending keys |
