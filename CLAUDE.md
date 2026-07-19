@AGENTS.md

# FLOAT — build rules and pinned context

A chain-abstracted social money layer. Four modes (Send · Split · Leash · Pledge), one identity, one balance, on Particle Universal Accounts in EIP-7702 mode with Magic onboarding, settling on Arbitrum. Product canon lives in `internal/FLOAT-PRD.md` (gitignored). The frontend's real data seam is documented in `DATA_CONTRACTS.md` — read it before designing any API.

## Repo layout

```
apps/web         Next.js frontend (built — do not rewrite or downgrade)
apps/api         backend API (Railway)            [phase 4]
packages/contracts  Solidity + Hardhat (Arbitrum) [phase 2]
packages/indexer    viem event worker (Railway)   [phase 5]
packages/db         Supabase schema, migrations, generated types [phase 1]
internal/        PRD + strategy notes — gitignored, never commit
```

npm workspaces. Run everything from the root: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`.

## Pinned versions

| | |
|---|---|
| Node | >= 20 (local dev on 24) |
| Next.js | 16.2.10 — **Next 14 is end-of-life and must never appear** |
| React | 19.2.4 |
| Tailwind | v4 — CSS-first config in `apps/web/src/app/globals.css`, there is no `tailwind.config.js` |
| TypeScript | 5.x |
| Solidity | 0.8.24 |

## Rules

1. **No mocks, no fake data, no demo mode.** Every rendered value comes from Postgres or the chain. On-chain state is authoritative for money and authority; Postgres is authoritative for the social layer and is a read-cache the indexer keeps in sync.
2. **Verify every SDK call against installed types** (`node_modules/<pkg>/**/*.d.ts`) or official docs before writing it. If a method cannot be verified, stop and say so. Hallucinated SDK surfaces are the most expensive failure mode in this build.
3. **Phase-gated.** Build the current phase only, then stop for confirmation. Phases are listed in `AGENT_PROGRESS.md`.
4. **Every state-changing contract function emits a named event** with indexed fields.
5. **Every write persists, and the response returns the persisted row** — never an object constructed in memory.
6. **Tests are as long as the code.** Contracts get full failure-path coverage with real authorization checks.
7. **No secrets in the repo.** Env vars only, with blank-valued keys in `.env.example`.
8. **Never scope-cut.** Present tradeoffs on technical merits — security model, attack surface, composability, latency — not on time or effort.

## Frontend conventions (established, follow them)

- Design system is **light lavender/brutalist**, not the dark palette in the PRD — the PRD's `DESIGN LANGUAGE` section is superseded by `apps/web/src/app/globals.css`. Tokens: `bg-page`, `bg-surface`, `border-void`, `text-text`/`text-muted`, accents `signal`/`coral`/`mint`/`lav`.
- Brutalist offset shadows via `shadow-[Npx_Npx_0_0_var(--color-brut-line)]`, with a hover translate of the same N.
- Fonts through `next/font` only — Space Grotesk (display), Inter (body), IBM Plex Mono (mono). **Never add Google Fonts `<link>` tags**; CI fails on the lint rule.
- Every animation checks `prefers-reduced-motion`. GSAP timelines are killed on cleanup.
- Async calls wrap in `try/catch` with `getErrorMessage` + `<ErrorNote>`; a failure must never strand a flow in a terminal in-flight state.
- Money is `number` in whole USD at the UI boundary. Convert to minor units / bigint before the chain layer — never pass a float on-chain.

## Verification before any gate

```bash
npm run lint       # eslint --max-warnings=0
npm run typecheck  # tsc --noEmit
npm run build
```

All three must be green. CI runs the same three on every PR.
