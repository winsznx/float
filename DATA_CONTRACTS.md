# DATA_CONTRACTS.md

What the existing frontend actually consumes, extracted from the code as of `5d7e697`. This is an audit, not a proposal — every type below is copied from a real file, and every gap listed is a real absence I confirmed by grep, not an assumption.

---

## 0. The headline finding

**The frontend makes zero network calls.** There is no `fetch`, no API route, no tRPC client, no Supabase client, no React Query — verified by grep across `apps/web/src`:

```
grep -rn "fetch(|axios|useSWR|useQuery|/api/|supabase|trpc" src   →  no matches
```

(The one `fetch` in the repo is `src/lib/og-fonts.ts`, which pulls font binaries for OG image generation at build time. Unrelated to app data.)

So the "contract the frontend already expects" is **not** an HTTP shape. It is the set of **async function signatures in `apps/web/src/lib/*.ts`** that the components import and await. Those seven functions are the real seam.

**Consequence for Phase 4:** there is no existing REST surface to conform to, so the transport is a free choice. See §5.

---

## 1. The seam: `apps/web/src/lib/*.ts`

Seven async functions. Every one currently returns a hardcoded value after a `setTimeout`. These signatures are the contract the backend must satisfy.

| Function | Signature | File |
|---|---|---|
| `sendMagicLink` | `(email: string) => Promise<void>` | `lib/auth.ts` |
| `resolveIdentity` | `(input: string) => Promise<IdentityResolution>` | `lib/identity.ts` |
| `checkHandleAvailability` | `(handle: string) => Promise<boolean>` | `lib/identity.ts` |
| `sendPayment` | `({recipient, amount, note}) => Promise<SendReceipt>` | `lib/send.ts` |
| `generateSplitLink` | `() => Promise<string>` | `lib/split.ts` |
| `getSplitStatus` | `(splitId: string) => Promise<MemberStatus[]>` | `lib/split.ts` |
| `settleMember` | `(splitId: string, input: string) => Promise<void>` | `lib/split.ts` |
| `createLeash` | `(CreateLeashParams) => Promise<Leash>` | `lib/leash.ts` |
| `getLeashUsage` | `(leashId: string, spendLimit: number) => Promise<number>` | `lib/leash.ts` |
| `revokeLeash` | `(leashId: string) => Promise<void>` | `lib/leash.ts` |
| `createPledge` | `(CreatePledgeParams) => Promise<Pledge>` | `lib/pledge.ts` |

### Exact types in use

```ts
// lib/identity.ts — consumed by IdentityInput, and by send/split/leash/pledge pages
type IdentityResolution = {
  input: string;                                       // raw user entry, echoed in UI
  type: "float" | "ens" | "farcaster" | "email" | "address";  // float wins over farcaster
  resolvedAddress: string | null;
  chains: string[];                                    // display strings e.g. ["Base","Arbitrum"]
  preferredChain: string;                              // display string e.g. "Arbitrum"
  isNewUser: boolean;
};

// lib/send.ts
type SendReceipt = { txId: string; timestamp: number };  // timestamp = ms epoch

// lib/split.ts
type MemberStatus = { input: string; amount: number; settled: boolean };

// lib/leash.ts
type ContractScope = "basic" | "advanced";
type Leash = {
  leashId: string;
  beneficiary: string;         // NOTE: the .input string, not an address
  spendLimit: number;
  contractScope: ContractScope;
  contractAddress: string | null;
  expiry: string;              // "YYYY-MM-DD" from <input type="date">
};

// lib/pledge.ts
type Pledge = {
  pledgeId: string;
  goal: string;
  stake: number;
  witness: string;             // NOTE: the .input string, not an address
  failureDestinationLabel: string;  // NOTE: label only — no address, no id
  deadline: string;            // "YYYY-MM-DD"
  isPublic: boolean;
};
type FailureDestination = { id: string; label: string };
const FAILURE_DESTINATIONS = [
  { id: "gitcoin", label: "Gitcoin Grants treasury" },
  { id: "dao",     label: "Recognized DAO multisig" },
  { id: "burn",    label: "Burn address" },
];  // labels only — no on-chain addresses anywhere in the frontend
```

### Type notes that affect schema design

- **Amounts are JS `number`, in whole USD** (e.g. `42.5`). Not wei, not bigint, not minor units. The DB and API must convert at the boundary; float money must not reach the chain layer un-normalized.
- **Dates are `"YYYY-MM-DD"` strings** from native date inputs — no time, no timezone. `LeashCard` parses them as `new Date(\`${value}T00:00:00\`)`, i.e. **local midnight**. Contract expiries are unix seconds, so the conversion needs an explicit timezone decision.
- **`Leash.beneficiary` and `Pledge.witness` are display strings** (`resolution.input`), not addresses. The resolved address is dropped on the floor today. The API must return both.
- **`failureDestinationLabel` carries no address.** `FAILURE_DESTINATIONS` is label-only. Real addresses for Gitcoin / DAO / burn must be supplied by the backend — this is PRD Open Question #6, still unanswered.
- **No token field anywhere.** USDC is assumed and hardcoded in copy (`AmountInput` subtext, `ConfirmationCard`). The schema keeps a `token` column, but the UI cannot yet select one.

---

## 2. Rendered data with **no backing function at all**

These are values on screen that no `lib/` function supplies. Each needs a service built from scratch, and each needs a frontend change in Phase 6 — they are not drop-in replacements.

| What renders | Where | Current source |
|---|---|---|
| **Unified balance** `$1,247.83` | `BalanceDisplay.tsx:6` | `const MOCK_BALANCE = 1247.83` |
| **Per-chain balances** | `BalanceDiscovery.tsx:8` | hardcoded `[Base 420.50, Arbitrum 612.10, Polygon 215.23]` |
| **Balance total** | `BalanceDiscovery.tsx:13` | `const TOTAL = 1247.83` |
| **Send max / source chain** | `send/page.tsx:16-17` | `SOURCE_CHAIN = "Base"`, `MAX_AMOUNT = 1247.83` |
| **Activity feed** | `home/page.tsx` | static `"No recent activity yet"` — no data path exists |
| **Notification badge** | `TopBar.tsx` | `hasUnread = true` default prop |
| **Leash spend usage** | `lib/leash.ts:41` | ratio of `DEMO_REFERENCE_USED/LIMIT` |
| **Split member roster** | `split/page.tsx:186` | in-memory `IdentityResolution[]`, never persisted |
| **Split status** | `lib/split.ts:7` | hardcoded 3-member `MOCK_STATUS` |

The **balance service is the largest single gap**: it backs four separate surfaces (home, discovery, send max, confirmation routing) and needs cross-chain aggregation through the Universal Account.

---

## 3. Missing surfaces the backend must serve

Routes that exist today:

```
/  /home  /send  /split  /leash  /pledge
/onboarding/email  /onboarding/identity  /onboarding/discovery
```

The PRD requires four recipient-facing flows that **have no route, no page, and no component**:

1. **`/settle/:token`** — split member settle. `generateSplitLink()` returns the string `float.app/settle/<random>`, but that path does not exist and the domain is invented. PRD § Split Flow step 8.
2. **Leash beneficiary claim** — "You've been given a spending key" → authenticate → see limits → spend. PRD § Leash Flow, beneficiary claim.
3. **Witness resolution** — witness opens pledge, confirms success or marks failure. PRD § Pledge Flow, witness resolution. **This is the only path that can trigger a slash**, so Phase 2's `confirmSuccess`/`confirmFailure` have no caller until it exists.
4. **Public pledge share card** — OG image + public page. `Pledge.isPublic` is captured and then unused; PledgeCard's share button copies a link to a page that does not exist.

These are net-new build, not wiring. Flagging now because Phase 6 ("wire frontend → backend") silently assumes every surface exists.

---

## 4. No identity or session layer

Confirmed absent: no `createContext`, no session provider, no user object, no auth guard, no cookie handling. `sendMagicLink()` returns `void` and stores nothing — the app has no concept of "who is logged in."

`/onboarding/identity` collects a handle and a profile photo (`URL.createObjectURL`, local preview only, never uploaded) and then `router.push`es onward without persisting either.

So `users`, sessions, RLS subject identity, and photo storage are **entirely greenfield**. Every RLS policy in Phase 1 depends on a session identity that does not exist yet — Phase 1 and Phase 3 are coupled more tightly than the phase order implies.

---

## 5. Transport decision: tRPC

The prompt says to check whether the frontend expects tRPC or REST. **It expects neither** — there is no network layer (§0). So this is an open choice, and I recommend **tRPC**:

- The seam is already typed async functions. tRPC procedures preserve those signatures end-to-end with zero hand-written client types, making Phase 6 a near-mechanical swap of `lib/*.ts` bodies.
- Both ends are TypeScript in one workspace, which is exactly tRPC's use case.
- No public/third-party API consumer exists that would need REST.

**Caveat to decide at Phase 4:** the three claim/settle surfaces (§3) are opened by *unauthenticated* users from a shared link. Those are better as plain REST routes with scoped, expiring tokens — simpler to reason about for anonymous access than tRPC context gymnastics. Recommend **tRPC for the authenticated app, a small REST surface for token-scoped claim links.**

---

## 6. Chain-layer dependencies not yet installed

`apps/web/package.json` has no `viem`, no `wagmi`, no `@particle-network/*`, no `magic-sdk`. Nothing in the chain stack is present — Phase 3 starts from zero, which is also why Phase 3 is correctly flagged as the highest-risk gate.

---

## 7. Preserved-by-contract behavior

Things the backend must not break, because the UI depends on them:

- `resolveIdentity` returning `isNewUser: true` drives the "will receive a claim link" branch in `IdentityInput`.
- `resolveIdentity` **rejecting** now renders a `failed` state (added in `5d7e697`). Real ENS lookups will reject; the API should reject rather than return a null-ish success.
- `getLeashUsage` returns a **number of dollars used**, not a ratio — `LeashCard` computes `used / spendLimit` itself.
- `IdentityInput` only calls `resolveIdentity` when input matches `*.eth` or contains `@`. Bare addresses and Farcaster handles never reach it, despite `IdentityResolution.type` including `"farcaster"` and `"address"`. Resolution for those types is unreachable until the frontend gate is widened.

---

## 8. The nine unbacked values — seam functions and phase mapping (locked)

Decision from the Phase 1 gate: each hardcoded value in §2 becomes a seam function, but they land across phases — and **balance is never a table**.

| Value (from §2) | Seam function (Phase 6 swap target) | Served by | Phase |
|---|---|---|---|
| Unified balance | `getUnifiedBalance(): Promise<{total: number}>` | **live UA query** — not Postgres | 3 (service) / 4 (endpoint) |
| Per-chain balances | `getChainBalances(): Promise<{chain: string; value: number}[]>` | live UA query | 3 / 4 |
| Send max / source chain | derived from `getUnifiedBalance` + routing | live UA query | 3 / 4 |
| Activity feed | `getActivity(): Promise<ActivityItem[]>` | `activity` table (created Phase 1, populated by indexer Phase 5) | 4 |
| Notification badge | `getUnreadCount(): Promise<number>` | `notifications` table (created Phase 1) | 4, realtime in 6 |
| Leash spend usage | `getLeashUsage` (exists) | `leashes.spent` — indexer-maintained cache | 5 |
| Split roster | persisted via `splits`/`split_members` | Phase 1 tables | 4 |
| Split status | `getSplitStatus` (exists) | `split_members` read | 4 |
| Witness/claim surfaces | token-scoped REST | `*_token` columns (Phase 1) | 4 + 6 |

**Deadline semantics (locked):** deadline = end of selected day (23:59:59) in the creator's local timezone, computed to unix seconds server-side at creation. `deadline_unix bigint` is authoritative (byte-for-byte what the contract stores); `deadline_tz` (IANA) rides alongside for display. Same pattern for leash expiry (`expiry_unix`, `expiry_tz`).
