# AGENT_PROGRESS.md

Session-continuity log. Updated at every phase gate.

---

## Status

**Current phase:** 0 — Foundation & Frontend Audit → **complete, awaiting confirmation**
**Next phase:** 1 — Database (Supabase Postgres). Do not start without confirmation.

| Phase | State |
|---|---|
| 0 · Foundation & frontend audit | ✅ complete |
| 1 · Database (Supabase + RLS) | ⬜ not started |
| 2 · Contracts (LeashManager, PledgeVault) | ⬜ not started |
| 3 · SDK integration (Particle 7702, Magic, WalletConnect) | ⬜ not started |
| 4 · Backend API services | ⬜ not started |
| 5 · Event indexer | ⬜ not started |
| 6 · Wire frontend → backend | ⬜ not started |
| 7 · Testing & hardening | ⬜ not started |
| 8 · Deployment | ⬜ not started |
| 9 · Submission artifacts | ⬜ not started |

---

## Phase 0 — done

- Audited the full frontend; produced `DATA_CONTRACTS.md`.
- Restructured to npm workspaces: web moved to `apps/web` via `git mv` (history preserved); created `apps/api`, `packages/contracts`, `packages/indexer`, `packages/db`.
- Root `package.json` with workspace scripts; `@float/web` renamed and given `lint`/`typecheck` scripts.
- `internal/` gitignored; PRD at `internal/FLOAT-PRD.md`.
- CI updated for the workspace layout.
- Verified after restructure: lint, typecheck, build all green.

### Decisions

| Decision | Rationale |
|---|---|
| **tRPC** for the authenticated app | Frontend has no network layer at all, so transport is a free choice. The seam is typed async functions; tRPC preserves those signatures end-to-end and makes Phase 6 a near-mechanical swap. |
| **REST** for claim/settle/witness links | Those are opened by unauthenticated users from shared links; scoped expiring tokens over plain REST is simpler to reason about than anonymous tRPC context. |
| Money as `number` USD at the UI boundary, converted at the API | Matches what the frontend already passes. Conversion to minor units happens once, server-side, before the chain layer. |
| PRD design section is superseded | Shipped UI is light lavender/brutalist; `globals.css` is canonical, not the PRD's dark palette. |

---

## Open questions — blocking or near-blocking

1. **Failure-destination addresses (blocks Phase 2 + 4).** `FAILURE_DESTINATIONS` in the frontend is labels only — Gitcoin / DAO multisig / burn have no addresses anywhere. PledgeVault needs real ones. PRD Open Question #6, still unanswered.
2. **Timezone for date → unix expiry (blocks Phase 2).** UI collects `"YYYY-MM-DD"` and renders at local midnight. Contract expiries are unix seconds. Pick UTC midnight or local; it changes slash timing by up to a day.
3. **Magic + EIP-7702 signing path (Phase 3 gate).** Magic is a listed Particle 7702 partner, but the exact hook for signing a 7702 authorization from a Magic-provisioned wallet is unverified. Highest-risk unknown in the build.
4. **Four missing frontend surfaces** (`/settle/:token`, leash beneficiary claim, witness resolution, public pledge page). Net-new build, not wiring — Phase 6 assumes they exist. Witness resolution especially: without it, `confirmSuccess`/`confirmFailure` have no caller.
5. **Farcaster resolution: Hubble vs Neynar** — rate limits and auth unconfirmed. PRD Open Question #3.
6. **Arbitrum RPC provider** — Alchemy vs Infura vs native. PRD Open Question #5.

---

## Gotchas discovered

- **`.next` must be cleared when switching between `next build` and `next dev`** — a stale production build makes the dev server 404 every route. Cost real debugging time.
- **OG font fetches are network-dependent at build time.** `/apple-icon`, `/icon`, `/opengraph-image` each fetch Google Fonts during prerender; this failed ~1 in 3 builds before retry/caching was added in `5d7e697`. If builds go flaky again, look here first.
- **Chrome headless `--window-size` enforces a minimum width (~500px)**, so mobile screenshots crop rather than reflow. Render inside a sized iframe to check real mobile layout — a raw `--window-size=390` screenshot looks like a horizontal-overflow bug that isn't there.
- **Tailwind v4 has no `tailwind.config.js`** — theme tokens live in `@theme` inside `globals.css`.
- **The PRD is still in git history** (commits `a5d36d2`, `c32299c`) and on the GitHub remote. Gitignoring `internal/` stops future commits but does not retract it. History rewrite + force push would be needed for true removal.
- OG images and the favicon still render in **Syne**, the pre-restyle PRD font, so they don't match the app's Space Grotesk. Cosmetic, unfixed.

---

## Verification log

| Gate | lint | typecheck | build | notes |
|---|---|---|---|---|
| Phase 0 | ✅ | ✅ | ✅ | 4 consecutive clean builds after OG-font retry fix |
