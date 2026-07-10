# FLOAT — Frontend Handoff

You own the frontend, end to end. This doc is everything you need to start today. The full product spec lives in [`float-prd.md`](./float-prd.md) — read it once, then keep it open. This file tells you what's already wired, where to build, and the rules that keep the UI coherent.

---

## TL;DR

- **Stack is scaffolded and building.** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4.
- **Design tokens are live** — colors and fonts from the PRD are already wired into Tailwind. Use `bg-float-signal`, `text-float-heading`, `font-display`, etc. Don't hand-roll hex values.
- **The landing page** ([`src/app/page.tsx`](./src/app/page.tsx)) is a reference implementation of the aesthetic. Match its density and restraint.
- **You build the four modes + shell.** Contracts and SDK wiring are separate; you build against the interfaces described here and in the PRD, mocking data where the backend isn't ready.

---

## Run it

```bash
npm install
cp .env.example .env.local   # fill in as keys become available; UI runs without them
npm run dev                  # http://localhost:3000
npm run build                # must stay green before every PR
npm run lint
```

Node 20+ recommended (Next 16 requirement).

---

## What's already done

| Thing | Where | Notes |
|---|---|---|
| Next 16 + TS + Tailwind v4 | root | App Router, `src/` dir, `@/*` import alias |
| Design tokens (color) | [`src/app/globals.css`](./src/app/globals.css) | `@theme` block — every PRD color is a utility |
| Fonts (Syne / Inter / JetBrains Mono) | [`src/app/layout.tsx`](./src/app/layout.tsx) | via `next/font`, self-hosted, no CDN. `font-display` / `font-body` / `font-mono` |
| Landing reference screen | [`src/app/page.tsx`](./src/app/page.tsx) | wordmark, tagline, auth CTAs, four-mode cards |
| Env template | [`.env.example`](./.env.example) | Particle / Magic / WalletConnect / RPC / contract addrs |

**Why Next 16, not 14 (as the PRD says):** Next 14 ships with the middleware auth-bypass CVE (CVE-2025-29927) and other advisories. We're on 16.2.10. The PRD's "Next.js 14" line is superseded — everything else in the PRD stands.

> One known transitive advisory remains: `postcss < 8.5.10` (build-time only, pinned by Next internals, not runtime-exploitable). Do **not** run `npm audit fix --force` — it downgrades Next to v9. It clears when Next bumps the pin.

---

## Design system — the non-negotiables

Read [`float-prd.md`](./float-prd.md) §§ DESIGN LANGUAGE, COMPONENT LIBRARY, MOTION for the full picture. The rules that matter most:

1. **No pure white, no pure black — ever.** Every surface has a faint violet undertone. The tokens already encode this; just use them.
2. **One accent.** `float-signal` (#7B6EF6) is the *only* charged color. CTAs, active states, value numbers, progress fills. Everything else is greyscale-violet.
3. **Type is the design material.** No icons carrying meaning without a label. No decorative graphics. `font-display` (Syne 800) only for the biggest number/name on a screen.
4. **Motion only at state transitions** — amount ticks, status changes, a lock engaging. Never decorative. Fast in, slow out.
5. **No crypto jargon in the UI.** No "gas", "chain", "bridge", "wallet address" as primary copy. See PRD § COPY VOICE. Routing detail is allowed only in muted confirmation text.

### Token cheat sheet

```
Backgrounds   bg-float-void (page) · bg-float-surface (card) · bg-float-surface-2 (modal/elevated)
Borders       border-float-border
Text          text-float-heading (big) · text-float-body (default) · text-float-muted (de-emphasized)
Accent        bg-float-signal / text-float-signal
Status        text-float-positive · text-float-warning · text-float-danger
Fonts         font-display (Syne) · font-body (Inter) · font-mono (JetBrains — addresses/hashes only)
Radius        rounded-2xl (sheets) · rounded-xl (modals) · rounded-lg (cards) · rounded-full (buttons)
```

Type scale, spacing scale, and elevation rules are in PRD § DESIGN TOKEN SYSTEM. Follow them.

---

## What to build

Build mobile-first. The whole app is a single authenticated shell with four modes. Suggested order — ship each mode as a vertical slice (screen + interactions, mocked data) before wiring real SDKs.

### 0. Shell — build first
- Global shell: bottom nav (4 modes + avatar), top bar (wordmark + notification bell), mode pill selector. PRD § COMPONENT LIBRARY → Global Shell.
- Route structure (App Router): `/(app)/home`, `/send`, `/split`, `/leash`, `/pledge`, plus onboarding `/`.
- The **Balance Display** — the single most important component. Big number, muted chain summary, tap-to-open balance sheet drawer. PRD § The Balance Display.

### 1. Onboarding — PRD § SCREEN INVENTORY 0
Landing (done as reference) → email flow (Magic) / wallet connect (7702) → identity setup → **balance discovery** (the "wow moment" — staggered count-up animation).

### 2–5. The four modes — PRD § SCREEN INVENTORY 2–5 and § COMPONENT LIBRARY
- **Send** — recipient resolution → amount input → confirmation card → send animation → receipt.
- **Split** — Splitwise-style: total → members → shares → share link → organizer dashboard → one-tap settle.
- **Leash** — beneficiary → limit/token → expiry → Leash card (live progress bar) → revoke.
- **Pledge** — goal → stake → witness → failure destination → Pledge card (locked state) → public share card.

Each mode's card component is fully specced (ASCII layouts + color behavior) in the PRD. Build those cards first; they anchor each mode.

### Reusable components to extract early
`BalanceDisplay`, `AmountInput` (with quick-select pills), `IdentityInput` (with inline resolution state), `ConfirmationCard`, `LeashCard`, `PledgeCard`, `ModePill`, `BottomNav`. Put them in `src/components/`.

---

## Data & integration boundaries

You build the UI against these interfaces. Where the backend/SDK isn't ready, **mock it** behind a typed function so the swap is trivial later.

- **Identity resolution** — implement `resolveIdentity(input): Promise<IdentityResolution>` (interface in PRD § Identity Resolution Service). Mock it returning canned ENS/email results so the Send/Split UI is fully clickable now.
- **Universal Account SDK** (Particle, EIP-7702) — the send/settle/pull/slash calls. Interface sketch in PRD § Core SDK Integration. Wrap every SDK call in a thin `src/lib/` module; don't scatter SDK calls through components.
- **Magic** — email/passkey login → embedded wallet. Wrap in `src/lib/auth`.
- **Contracts** — `LeashManager` and `PledgeVault` ABIs/addresses land in `.env`. Read/write via viem. Simplified contract shapes are in the PRD.

Keep all env-dependent code behind `src/lib/` modules with mock fallbacks so `npm run dev` works with an empty `.env.local`.

---

## Conventions

- **TypeScript**: no `any` without a justification comment; no `@ts-ignore`. Explicit return types on exported functions. `kebab-case` filenames, `PascalCase` components, named exports.
- **React 19 / Next 16**: Server Components by default; add `"use client"` only where you need interactivity/hooks. Prefer derived values over `useState` + `useEffect`.
- **Styling**: Tailwind utilities with the FLOAT tokens only. No inline hex, no arbitrary colors outside the token set (arbitrary *sizes* like `text-[64px]` are fine — see the landing page).
- **Accessibility**: labelled controls, focus-visible rings using `--float-signal-glow`, respects `prefers-reduced-motion` for the animations.

---

## Workflow

1. You've been invited to `winsznx/float` with write access — accept the invite.
2. Branch per feature: `feat/shell`, `feat/send-flow`, etc. Don't push to `main` directly.
3. `npm run build` and `npm run lint` must be green before you open a PR.
4. Open PRs against `main`; tag `@winsznx` for review.
5. Deployment target is Vercel (per PRD) — don't worry about deploy config yet, that's wired separately.

---

## Open questions (from PRD § OPEN QUESTIONS)

These affect integration, not your UI work — build the UI against mocks and these resolve in parallel: ENS resolution on Base/Arbitrum, Magic + 7702 signing path, Farcaster resolution (Neynar vs Hubble), Leash session-key mechanism, Arbitrum RPC/testnet choice, Pledge failure-destination list. Full text in the PRD.

Ping `@winsznx` on anything ambiguous. Build the experience in the PRD — clean, calm, consumer-grade, zero chain awareness. Ship it.
