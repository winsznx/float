# FLOAT — Product Requirements Document
### Version 1.0 | UXmaxx Hackathon Submission | Particle Network + Arbitrum + Magic Labs

---

## EXECUTIVE SUMMARY

**FLOAT** is a chain-abstracted social money layer. One product. Four use modes. Zero chain awareness for the user.

The central insight: crypto users don't have one money problem. They have four that share the same root — **their assets are fragmented across chains, and every action that involves another person requires them to think about infrastructure instead of intent.** FLOAT eliminates the infrastructure layer entirely and replaces it with intent: *send, split, delegate, commit.*

Built on Particle Network Universal Accounts in EIP-7702 mode, with Magic Labs embedded wallets for onboarding and Arbitrum as the settlement layer, FLOAT is the first app that unifies these four primitives into a single product with a single identity and a single balance.

**Hackathon track strategy:**
- Primary: Universal Accounts Track → $2,500
- Bonus 1: Arbitrum "Road to Open House London" Bounty → $2,000
- Bonus 2: Magic Labs Bonus Challenge → $500
- **Total potential: $5,000**

---

## THE ONE USER, THE FOUR PROBLEMS

The target user is someone who already has crypto — stablecoins spread across two or three chains — and regularly hits walls when trying to use it with other people.

They are not a DeFi power user. They are not a degenerate trader. They are a person who:
- Has USDC sitting on Base from one thing and ETH on Arbitrum from another
- Uses Venmo or PayPal for actual social spending because crypto is too complicated
- Has given someone a spending budget informally ("here's $200 for the month") and had no way to enforce it onchain
- Has tried to hold themselves accountable to a goal and failed because there was no real consequence
- Has sent to a wallet address and spent 3 minutes staring at the hex string making sure it was right

These are four independent problems that all resolve to the same root: **the user has value on multiple chains and no ergonomic way to direct it at other people.**

FLOAT is one product with four modes that solves all four at once.

---

## THE FOUR MODES

### MODE 1 — SEND
*"Send money to anyone using just their handle. No chain. No address copy-paste."*

**The pain:** ENS resolves to Ethereum mainnet. If you want to send USDC to someone on Base, you either bridge first or they bridge after. There is no "just send" product. You still copy a 42-character hex string and hope.

**FLOAT's answer:** Type a username (ENS, Farcaster handle, or email). FLOAT resolves it to a Universal Account. Pick an amount. Hit send. From whatever chain/token the sender has, to wherever the recipient prefers. No chain selection. No bridge step. The recipient gets a push notification and sees the funds in their FLOAT balance.

**EIP-7702 unlock:** The sender's existing EOA is upgraded to a UA in place. No migration. Their existing MetaMask address is the send address. The recipient, if they don't have an onchain identity yet, gets a Magic embedded wallet provisioned at claim time — same link, same email, instant wallet.

---

### MODE 2 — SPLIT
*"Create a group tab. Everyone settles from whatever they have. Nobody touches a bridge."*

**The pain:** The end of a group dinner. Four people. Three different wallets. Two different chains. One person Venmo-requests everyone because crypto is too hard. The crypto solution either requires everyone to be on the same chain (they're not) or requires bridging (they won't).

**FLOAT's answer:** One person creates a Split. Sets the total and adds members by handle or link. FLOAT calculates shares. Each member settles in one tap — from their UA, sourced from whatever chain/token they hold. The organizer receives the full amount consolidated. The UI looks like Splitwise. The settlement layer is invisible.

**Key UX detail:** Members who don't have a FLOAT account yet receive a link. They connect an existing wallet (MetaMask, Coinbase Wallet, anything). EIP-7702 upgrades it to a UA on the spot. They settle. Done. Zero new wallet creation required.

---

### MODE 3 — LEASH
*"Give anyone a scoped spending key into your balance — capped, time-limited, revocable."*

**The pain:** You want to give someone access to a defined amount of your money without transferring it. A VA with a $500/month budget. A contractor with a one-time $1,200 payment authority. A DAO contributor with milestone-gated access. The current options are: (a) manually send and lose custody, (b) set up a multisig (too complex), or (c) use a corporate card (fiat only, custodial, not self-sovereign).

**FLOAT's answer:** Create a Leash. Set: beneficiary (handle or email), max spend amount, allowed tokens, allowed contracts (optional), and expiry date. Share a link. The beneficiary opens it, authenticates with email or passkey (Magic), and gets a scoped session key that lets them pull funds within your defined limits — from your UA, across whatever chains your balance spans. You see a live usage feed. You can revoke at any time.

**EIP-7702 unlock:** EIP-7702 enables time-bounded sub-keys with restricted scope — a session key valid for one hour, scoped to a single contract, with a max spend cap. The user signs once to authorize the session; the app signs subsequent transactions with the session key without prompting again. FLOAT surfaces this as a consumer-grade "virtual card for your crypto wallet."

**Use cases the UI presents:**
- Monthly budget (VA, contractor, remote worker)
- Teen allowance
- Event expense account (give your event coordinator a $2k key)
- DAO contributor milestone access
- Shared household expenses

---

### MODE 4 — PLEDGE
*"Lock your own money against a goal you set. Lose it to something you hate if you quit."*

**The pain:** Commitment devices (Beeminder, StickK) work — users report them as genuinely life-changing — but they're all fiat and custodial. You trust them with your credit card. There is no trustless, non-custodial, cross-chain version. And the single mechanic that makes Beeminder legendary is the "loss to something aversive" — you don't just lose money, you lose it *to a cause you nominated that you hate*. This is the psychological hook. It has never been done onchain.

**FLOAT's answer:** Create a Pledge. Set a goal in plain language. Lock N USDC from your UA balance (pulled cross-chain, no manual bridging). Nominate a witness (a friend, a co-founder, a coach — anyone with a handle). Set a failure destination: a charity, a protocol treasury, a rival DAO, a political cause that makes you wince. Set a deadline. The witness confirms or denies at the deadline. If success: funds unlock back to you. If failure: FLOAT fires a cross-chain transfer to the failure destination automatically.

**Secondary mode:** Public accountability board. Any Pledge can be made public with a shareable card. DAOs use it for contributor commitments. Builders use it for launch pledges. Communities rally around visible stakes.

**EIP-7702 unlock:** The FLOAT Pledge contract holds a session key scoped specifically to the slash-and-transfer operation. It can only fire to the pre-nominated failure destination. The user's main balance is untouched otherwise. The lock is transparent, non-custodial, and fully auditable.

---

## PRODUCT NAME & IDENTITY

**Name:** FLOAT

**Why:** Money that moves frictionlessly. Your balance floats across chains. You don't carry it from chain to chain — it's just... there, wherever you need it. The name implies effortlessness, liquidity, presence without weight. It's a one-syllable word that works in copy ("float them $20"), as a verb ("I'll float it to you"), and as a brand.

**Tagline:** *Your money. Any chain. Just send.*

**Sublines by mode:**
- Send: *Type a name. Not an address.*
- Split: *Everyone settles from what they have.*
- Leash: *Their key. Your rules. Your balance.*
- Pledge: *Skin in the game. Onchain.*

---

## DESIGN LANGUAGE

### Philosophy
FLOAT is not a crypto app. It's a money app that happens to run on crypto. The design must be so clean, so human, so obviously consumer-grade that a judge looking at the demo for the first time does not clock that it's onchain. The design communicates: *this is where money lives when money works correctly.*

The visual language must feel like what you'd get if a fintech design team from 2030 went back and built the Venmo that should have existed — but stripped out all the social feed performativity and replaced it with calm, purposeful structure.

### Aesthetic Direction: Pressurized Minimalism

The aesthetic is what happens when you compress a lot of capability into a container that shows almost none of it. Like a sealed titanium card that does everything. The UI has:

- **Very high negative space** — content appears with room around it, never crowded
- **Surgical use of color** — almost monochromatic, with one charged accent that signals action
- **Type as the primary design material** — no icons carrying meaning without labels, no decorative graphics
- **Motion only at information moments** — amount ticks up, a status changes, a lock engages. Motion is meaningful, not ornamental.

### Design Token System

#### Color Palette

```
--float-void:        #0A0A0F   /* Near-black. Primary background. Not pure black — has a faint blue-violet undertone. */
--float-surface:     #111118   /* Card/panel background. 1 tone above void. */
--float-surface-2:   #1C1C26   /* Elevated surface. Modals, drawers. */
--float-border:      #2A2A38   /* Subtle structural lines. */
--float-muted:       #4A4A62   /* De-emphasized text, placeholders. */
--float-body:        #C8C8DC   /* Primary body text. Not white — has violet warmth. */
--float-heading:     #F0F0FF   /* Near-white with faint violet. Headlines, large type. */

--float-signal:      #7B6EF6   /* Charged violet-indigo. The one accent. Used for: CTAs, active states, value numbers, progress fills. */
--float-signal-dim:  #3D3680   /* Darker signal for backgrounds behind signal text. */
--float-signal-glow: rgba(123, 110, 246, 0.15) /* Ambient glow behind key elements. */

--float-positive:    #3DD68C   /* Success, confirmed, received. Mint-green. */
--float-warning:     #F5A623   /* Pending, in-progress. Amber. */
--float-danger:      #F55C5C   /* Failure, slash, rejection. Coral-red. */

--float-pledge-lock: #7B6EF6   /* Pledge locked state = signal color */
--float-pledge-burn: #F55C5C   /* Pledge at risk / slashed */
```

**No pure white (#FFFFFF) anywhere.** No pure black (#000000) anywhere. Every surface has a faint violet undertone. This is the one distinguishing color decision — it gives the UI a singular character that reads as crafted, not templated.

#### Typography

**Display / Hero type:** `Syne` (Google Fonts, free)
- Extra Bold (800) for hero numbers, mode names, amount displays
- Used sparingly — only for the biggest information in a given screen
- Tracking: tight to normal. Never loose.

**Body / Interface:** `Inter` (standard but set with deliberate metrics)
- Weight scale: 400 (body), 500 (labels, secondary CTAs), 600 (primary labels, tab names), 700 (emphasized values)
- Letter-spacing: -0.01em for body, -0.02em for headings, 0.04em for ALL CAPS labels
- Line-height: 1.5 for body, 1.2 for display, 1.0 for large numbers

**Data / Monospace:** `JetBrains Mono` (condensed, used only for addresses, amounts in confirmation screens, hash values)
- Makes technical data legible without hiding it
- Only weight: 400, with 0.02em tracking

**Type Scale:**
```
--text-xs:    11px / 500 / 0.04em uppercase  → labels, badges, status chips
--text-sm:    13px / 400                     → supporting copy, captions
--text-base:  15px / 400                     → primary body
--text-md:    17px / 500                     → emphasized body, secondary headings
--text-lg:    20px / 600                     → section titles, card headers
--text-xl:    28px / 700 Syne                → screen titles, mode names
--text-2xl:   40px / 800 Syne               → balance display, large amounts
--text-3xl:   64px / 800 Syne               → hero splash numbers
```

#### Spacing System (8px base)
```
--space-1: 4px    --space-2: 8px    --space-3: 12px
--space-4: 16px   --space-5: 20px   --space-6: 24px
--space-8: 32px   --space-10: 40px  --space-12: 48px
--space-16: 64px  --space-20: 80px  --space-24: 96px
```

#### Border Radius
```
--radius-sm: 8px      → chips, small badges
--radius-md: 12px     → input fields, small cards
--radius-lg: 16px     → primary cards
--radius-xl: 20px     → modal panels
--radius-2xl: 28px    → bottom sheets, large containers
--radius-pill: 9999px → buttons, tags, status dots
```

#### Elevation (Shadow System)
No box-shadows in the traditional sense. Use background color differentiation + `--float-signal-glow` for key focus states.

```
focus ring: 0 0 0 2px --float-signal-glow, 0 0 0 4px --float-signal (20% opacity)
active card: background shifts to --float-surface-2
hover: background shifts +1 level up, no shadows
```

---

## COMPONENT LIBRARY

### Global Shell
- **Bottom navigation** (mobile-first) with 4 mode icons + account avatar
- **Top bar**: FLOAT wordmark left, notification bell right (badge on unread)
- **Mode pill selector**: subtle horizontal tabs at top of content area — `Send · Split · Leash · Pledge`
- Background is always `--float-void`. No white-background pages.

### The Balance Display
This is the most important component in the app. It lives at the top of the home screen and the send/split initiation flows.

```
┌────────────────────────────────────────────────┐
│                                                │
│   YOUR BALANCE                                 │
│   (text-xs label, --float-muted)               │
│                                                │
│   $1,247.83                                    │
│   (text-3xl, Syne 800, --float-heading)        │
│                                                │
│   ● 4 chains  ·  USDC · ETH · MATIC           │
│   (text-xs, --float-muted, dots as delimiters) │
│                                                │
└────────────────────────────────────────────────┘
```

The chain count and token list are the only references to chain complexity in the entire app. They appear in muted text. The user sees one number. The "4 chains" detail is discoverable via tap, not forced on them.

Tapping the balance opens a **balance sheet drawer** from the bottom showing a breakdown by chain with chain logos, amounts, and USDC equivalent. This is the only place chains are shown explicitly.

### Amount Input
Large, focused. The number is the UI.

```
┌────────────────────────────────────────────────┐
│                                                │
│              $   [  0  ]                       │
│         (Syne 800, text-3xl, center)           │
│                                                │
│         USDC  ·  from your balance             │
│         (text-sm, --float-muted)               │
│                                                │
│    [ 25 ]  [ 50 ]  [ 100 ]  [ MAX ]            │
│    (quick-select pills, --float-surface-2)     │
│                                                │
└────────────────────────────────────────────────┘
```

No token selector visible by default. The app picks the best sourcing automatically. Advanced token selection is one tap behind an "Advanced" label.

### Identity Input (Send / Split recipient)
```
┌────────────────────────────────────────────────┐
│  To                                            │
│  ────────────────────────────────────────────  │
│  [  name.eth, @handle, or email...  ]          │
│                                                │
│  ↓ resolving...                                │
│  ✓ tim.eth → found on Base + Arbitrum          │
│                                                │
└────────────────────────────────────────────────┘
```

Resolution state is shown inline with a soft animation — the "resolving..." spinner is a 1px circular progress ring in `--float-signal`. On resolution, the name expands to show avatar + handle + "found on [chains]" in muted text.

**Unknown recipients** (no onchain identity):
```
  ✉ invite@email.com → will receive a claim link
  (--float-warning dot, "new to FLOAT")
```

### Transaction Confirmation Card
Before any send/split/leash/pledge action fires:

```
┌────────────────────────────────────────────────┐
│  SENDING                                       │
│  (text-xs label)                               │
│                                                │
│  $50.00 USDC                                   │
│  (text-2xl, Syne, --float-heading)             │
│                                                │
│  TO   tim.eth                                  │
│  FROM  your balance (Base → Arbitrum)          │
│                                                │
│  ● Gas: $0.00  (sponsored)                     │
│  ● Estimated: ~8 seconds                       │
│                                                │
│  [ Confirm & Send ]                            │
│  (--float-signal background, full width, pill) │
│                                                │
└────────────────────────────────────────────────┘
```

Gas is $0.00 because it's sponsored. This line must be visible. It is one of the most powerful UX signals in the app — the user sees that they are not paying gas, and they understand immediately that something fundamental has changed.

### Leash Card (active state)
```
┌────────────────────────────────────────────────┐
│  LEASH                                   LIVE  │
│  ──────────────────────────────────────── ●    │
│                                                │
│  sarah@company.com                             │
│  (text-md, --float-heading)                    │
│                                                │
│  $180 used  /  $500 limit                      │
│  ████████░░░░░░░░░░░░  36%                     │
│  (progress bar in --float-signal)              │
│                                                │
│  Expires: Jun 30, 2026  ·  USDC only           │
│  (text-xs, --float-muted)                      │
│                                                │
│  [ Revoke ]  (text only, --float-danger)       │
│                                                │
└────────────────────────────────────────────────┘
```

The progress bar is the key information element. Green when low usage, transitioning to amber at 80%, red at 95%. It tells the creator at a glance if the beneficiary is pacing normally or approaching the limit.

### Pledge Card (locked state)
```
┌────────────────────────────────────────────────┐
│  PLEDGE                               LOCKED   │
│  ──────────────────────────────────────── 🔒   │
│                                                │
│  "Ship TryAnneal v1 by June 15"                │
│  (text-md, italic, --float-body)               │
│                                                │
│  $200.00 at stake                              │
│  (text-xl, Syne, --float-signal)               │
│                                                │
│  Failure → Rival DAO treasury                  │
│  (text-sm, --float-danger)                     │
│                                                │
│  Witness: kaptan.eth  ·  Due Jun 15            │
│  (text-xs, --float-muted)                      │
│                                                │
│  [ Share pledge ]  (text only, secondary)      │
│                                                │
└────────────────────────────────────────────────┘
```

The "at stake" number is in `--float-signal` when locked (it's yours, it's still locked). It shifts to `--float-danger` in the "at risk" state when deadline is within 24 hours or witness has not yet confirmed.

---

## SCREEN INVENTORY

### 0. Onboarding / Auth
- **Landing splash**: wordmark, tagline, "Continue with Email" (Magic) + "Connect Wallet" (EIP-7702 upgrade path)
- **Email flow**: Magic Labs magic link. No seed phrase. No password. One email sent.
- **Wallet connect flow**: WalletConnect modal → any EOA connects → EIP-7702 authorization prompt → "Your wallet is now a Universal Account" confirmation
- **Identity setup**: choose handle (ENS lookup or FLOAT handle), optional profile photo
- **Balance discovery**: after UA provisioning, FLOAT scans and displays unified balance across chains. This screen is the first "wow moment" — the user sees all their scattered assets in one number for the first time.

### 1. Home
- Balance display (full width, top)
- Quick action row: `[Send]  [Split]  [Leash]  [Pledge]` — 4 pill buttons
- Activity feed: recent sends, active leashes, open splits, live pledges
- Empty state per section: clear invitation copy, no generic "nothing here yet"

### 2. Send Flow
1. Recipient input (identity resolution)
2. Amount input + quick-select
3. Note (optional, 140 chars)
4. Confirmation card (shows routing: "from Base USDC → to tim.eth on Arbitrum")
5. Sending animation (amount lifts off, travels, lands)
6. Success: receipt card with share button

### 3. Split Flow
1. Split name (optional, e.g. "Tokyo dinner")
2. Total amount
3. Add members (handles / emails / wallet connect links)
4. Split method: equal / custom / percentage
5. Preview card showing each member's share
6. Share link generation (one tap)
7. Organizer dashboard: live view of who's settled and who hasn't
8. Settle flow for each member: tap link → connect wallet → one-tap settle

### 4. Leash Flow
1. Beneficiary input (handle or email)
2. Spend limit + token type
3. Allowed contracts toggle (basic / advanced)
4. Expiry date picker
5. Optional: allowed chains (default: any)
6. Review: Leash card preview
7. Confirm → session key provisioned
8. Share link sent to beneficiary
9. Active Leash dashboard: real-time spend tracker, activity log, revoke button

Beneficiary claim flow:
1. Open link → "You've been given a spending key"
2. Authenticate (email/passkey via Magic)
3. See available balance + limits
4. Trigger spend (if integrated contract) or pull to own wallet

### 5. Pledge Flow
1. Goal statement (text, 200 chars max — forces specificity)
2. Stake amount
3. Witness input (handle or email)
4. Failure destination picker:
   - From a curated list of recognized onchain causes
   - "Add custom address" for power users
   - "Something that makes you uncomfortable" label on UI
5. Deadline picker
6. Optional: make public toggle
7. Review: Pledge card preview
8. Confirm → funds locked in session key, witness notified

Witness resolution flow:
1. Witness receives notification at deadline (email or onchain notification)
2. Opens FLOAT → sees Pledge claim
3. Confirms success → funds unlock to pledger
4. Marks failure → FLOAT fires cross-chain transfer to failure destination
5. Witness sees resolution confirmation

Public pledge share card:
- Static image (OG-ready) showing: goal, stake, deadline, pledger handle
- Designed to be shared on X/Twitter — becomes social accountability layer

---

## ONBOARDING STRATEGY

### New user (no wallet)
1. "Continue with Email" → Magic provisioned wallet → UA upgrade → show unified balance (empty but ready) → onboarding prompt for first Send/Split

### Existing wallet user
1. "Connect Wallet" → WalletConnect → EIP-7702 authorization → UA upgrade → balance discovery screen showing all existing assets unified → "Your existing wallet is now a Universal Account"

### Recipient (receives link with no account)
1. Click claim/settle link → FLOAT web opens → "You've received [X]" → "Claim with email" (Magic) → wallet provisioned → funds arrive

The key principle: **zero friction for the recipient.** The sender can already have a FLOAT account. The recipient can be a complete crypto novice. FLOAT handles the wallet creation for them at claim time.

---

## TECHNICAL ARCHITECTURE

### Stack
```
Frontend:     Next.js 14 (App Router), TypeScript, Tailwind CSS
Wallet auth:  Magic Labs (email/passkey → embedded wallet)
              WalletConnect (existing wallet connect)
Chain layer:  Particle Network Universal Accounts SDK (EIP-7702 mode)
Settlement:   Arbitrum One (primary settlement chain)
Identity:     ENS resolution (viem + ENS public resolver)
              Farcaster Hubble API (username resolution)
              Email → Magic wallet provisioning
Contracts:    Solidity 0.8.24 (Leash session key manager, Pledge timelock)
              Deployed on Arbitrum One
Testing:      Hardhat, Chai, 100% coverage requirement
Monitoring:   Railway (backend services)
Deployment:   Vercel (frontend)
```

### Core SDK Integration

```typescript
// Universal Account initialization (EIP-7702 mode)
const ua = new UniversalAccount({
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY,
  projectAppUuid: process.env.NEXT_PUBLIC_APP_ID,
  smartAccountOptions: {
    useEIP7702: true,
    ownerAddress: wallet.address,
  },
});

// Cross-chain send — no chain selection by user
const transaction = await ua.createUniversalTransaction({
  chainId: CHAIN_ID.ARBITRUM_ONE,
  expectTokens: [{ tokenAddress: USDC_ADDRESS, amount: sendAmount }],
  transactions: [{ to: recipientAddress, data: "0x", value: "0" }],
});
```

### Identity Resolution Service

```typescript
interface IdentityResolution {
  input: string;                    // ENS / Farcaster / email
  type: 'ens' | 'farcaster' | 'email' | 'address';
  resolvedAddress: `0x${string}` | null;
  chains: number[];                 // chains where this address has activity
  preferredChain: number;           // chain with highest USDC balance
  isNewUser: boolean;               // no onchain identity found → claim flow
}

async function resolveIdentity(input: string): Promise<IdentityResolution>
```

### Leash Contract (simplified)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LeashManager {
  struct Leash {
    address owner;           // UA that created the leash
    address beneficiary;     // who can spend
    address tokenAddress;    // USDC or other ERC20
    uint256 spendLimit;      // max total
    uint256 spent;           // running total
    uint256 expiryTimestamp; // 0 = no expiry
    bool revoked;
  }

  mapping(bytes32 => Leash) public leashes;

  function createLeash(...) external returns (bytes32 leashId);
  function spend(bytes32 leashId, uint256 amount, address to) external;
  function revoke(bytes32 leashId) external;
  function remainingBalance(bytes32 leashId) external view returns (uint256);
}
```

### Pledge Contract (simplified)

```solidity
contract PledgeVault {
  struct Pledge {
    address pledger;
    address witness;
    address failureDestination;
    address tokenAddress;
    uint256 amount;
    uint256 deadline;
    bool resolved;
    bool succeeded;
  }

  mapping(bytes32 => Pledge) public pledges;

  function createPledge(...) external returns (bytes32 pledgeId);
  function confirmSuccess(bytes32 pledgeId) external;  // witness only
  function confirmFailure(bytes32 pledgeId) external;  // witness only
  function claimExpired(bytes32 pledgeId) external;    // auto-slash if deadline passed + no witness action
}
```

---

## MOTION & INTERACTION DESIGN

### Core Motion Principles
1. **Motion only at state transitions** — not as decoration
2. **Fast in, slow out** — elements arrive quickly, settle with a slight ease-out. Never linger.
3. **Physical metaphor** — money moves. Amounts travel, lift, settle. Not abstract fades.

### Key Animations

**Balance discovery (onboarding wow moment):**
- Individual chain balances appear sequentially (staggered 80ms apart)
- Then consolidate upward into the total with a smooth count-up
- Total number counts from 0 to actual value in 400ms with easeOutExpo
- Subtle signal glow pulses once on completion

**Send → success:**
- Amount display lifts slightly (translateY -4px) then floats off screen upward
- Brief particle burst in `--float-signal` at departure point
- Success screen: recipient avatar + amount settle in with a scale from 0.95 → 1.0

**Leash progress bar:**
- On load: fills from left with 300ms ease
- At 80% threshold: color transitions to `--float-warning`
- At 95% threshold: subtle pulse animation at fill edge

**Pledge lock:**
- Confirm tap: amount card compresses slightly (scale 0.98) then lock icon settles over it
- Lock icon: padlock closes with a 200ms animation
- "At stake" number pulses once in `--float-signal` on lock

**Mode switching (bottom nav):**
- Active mode indicator: a 2px underline that slides horizontally between tabs
- Content area: cross-fade at 150ms, not slide (less motion, more calm)

---

## COPY VOICE

FLOAT speaks like a calm, knowledgeable friend — not a crypto protocol, not a bank, not a startup. The voice:
- **Declarative, not instructional**: "Your wallet is now universal." not "Your wallet has been upgraded to Universal Account mode using EIP-7702."
- **No crypto jargon in the UI**: no "gas", no "chain", no "bridge" in any user-facing surface. These words do not exist in FLOAT's UX layer. (Technical confirmation screens show routing in muted text for transparency, but not as primary information.)
- **Short sentences. Present tense.** "Sending." not "Your transaction is being processed."
- **Failure states are honest, not apologetic**: "Couldn't resolve that name. Try an ENS or email." not "An error occurred."

### Key copy by screen

**Onboarding tagline:** *Your money. Any chain. Just send.*

**Balance discovery:** *Here's everything you have, together.*

**First-time send empty state:** *Send to anyone — by name, not address.*

**First-time leash empty state:** *Give someone access to part of your balance. You stay in control.*

**First-time pledge empty state:** *Put something on the line. Make it real.*

**UA upgrade confirmation:** *Your wallet is now universal. Your address didn't change. Your balance did.*

**Gas sponsorship line (on every tx):** *Gas: $0.00 — covered*

**Resolution success:** *Found. tim.eth is ready to receive.*

**Leash revoked:** *Access removed. Unused balance returned to your account.*

**Pledge: success:** *You did it. $200 returned.*

**Pledge: failure:** *Pledge not met. $200 sent to [Rival DAO]. It hurts. That was the point.*

---

## PRIZE COVERAGE AUDIT

### Universal Accounts Track (Primary — $2,500)
✅ Must use Universal Accounts SDK in EIP-7702 mode → all four modes use UA in 7702 mode
✅ At least one cross-chain operation moving value via UA → Send (cross-chain), Split (cross-chain settlement), Leash (cross-chain pull), Pledge (cross-chain slash)
✅ Functional demo (deployed or runnable locally) → Vercel deploy + Arbitrum One contracts

### Arbitrum Bounty ($2,000)
✅ Application and its components deployed on Arbitrum network → LeashManager + PledgeVault on Arbitrum One, Arbitrum as primary settlement chain
✅ Consumer app where Arbitrum powers the experience behind the scenes → user never sees "Arbitrum" in the main UI
✅ Chain-abstracted UX patterns: embedded wallets (Magic), gas abstraction, invisible bridging, account abstraction → all four present
✅ UX excellence (30%) + Creativity (30%) + Adoption potential (20%) + Execution quality (20%) → FLOAT scores on all four axes

### Magic Labs Bonus ($500)
✅ Integrate Magic's embedded wallet within application → Email login → Magic provisioned wallet → UA upgrade
✅ Social login, invisible wallets, smooth authentication → Magic handles all three
✅ Apps where users never need to install MetaMask → claim flow creates wallet at link-click
✅ Walletless onboarding flows → core to Split recipient + Pledge witness flows

---

## THE DEMO SCRIPT (60 seconds)

This is the video submitted with the hackathon. Shot on desktop, voice over optional.

```
0:00 — Open FLOAT. Landing screen. 
       "Continue with Email" — type an email. One click. 
       Magic link arrives. Click. Wallet created. Silent.

0:08 — Balance discovery screen. 
       Three chain balances appear, consolidate to $1,247. 
       "Here's everything you have, together."

0:15 — Tap SEND. 
       Type "tim.eth" in recipient field. 
       "Found. tim.eth on Arbitrum." 
       Type $50. Hit Confirm. 
       "Gas: $0.00 — covered."
       8 seconds. Amount lifts off. Success.

0:28 — Tap SPLIT. 
       Add 3 emails. Total: $120. Split equally. 
       Share link generated. 
       One recipient (no wallet) clicks link → 
       Magic wallet provisioned → settle in one tap.

0:42 — Tap LEASH. 
       Enter sarah@company.com. $500 limit. 30 days. 
       Link shared. Sarah opens it. Sees her budget.
       "You have access to $500."

0:52 — Tap PLEDGE. 
       "Ship FLOAT v1 by June 30." $100 at stake. 
       Failure → rival DAO. Lock. 
       Public share card generated.

1:00 — Cut to: FLOAT wordmark. 
       "Your money. Any chain. Just send."
```

---

## COMPETITIVE POSITIONING

| Feature | FLOAT | Venmo | Splitwise | Beeminder | Brex/Ramp |
|---|---|---|---|---|---|
| Cross-chain send | ✅ | ❌ | ❌ | ❌ | ❌ |
| Chain-agnostic (user never sees chain) | ✅ | N/A | N/A | N/A | N/A |
| Social split | ✅ | ✅ | ✅ | ❌ | ❌ |
| Scoped spending keys | ✅ | ❌ | ❌ | ❌ | ✅ (fiat only) |
| Non-custodial | ✅ | ❌ | ❌ | ❌ | ❌ |
| Commitment / pledge mechanic | ✅ | ❌ | ❌ | ✅ (fiat, custodial) | ❌ |
| Works with existing wallet (no migration) | ✅ | N/A | N/A | N/A | N/A |
| Gas abstraction | ✅ | N/A | N/A | N/A | N/A |

FLOAT is the first product that occupies all four cells simultaneously. The moat is not any single feature — it's that once a user's Universal Account is set up in FLOAT, every person they interact with financially is a potential onboarding moment. The network effects are social, not protocol-level.

---

## OPEN QUESTIONS FOR ENGINEERING

Before build begins, the following must be confirmed:

1. **ENS resolution on Base/Arbitrum**: does `viem` ENS resolution work for Base names (base.eth subnames) out of the box, or does it require custom CCIP-Read config?

2. **Magic + EIP-7702 compatibility**: Magic Labs is listed as a Particle EIP-7702 partner. Confirm the exact hook/SDK integration path for signing 7702 authorizations from a Magic-provisioned wallet.

3. **Farcaster handle resolution**: Hubble API or Neynar API for handle → custody address resolution? Confirm rate limits and authentication requirements.

4. **Leash session key mechanism**: does the Particle UA SDK expose a session key primitive directly, or is the Leash contract a standalone contract that holds a UA-signed spend authorization?

5. **Arbitrum deployment**: which Arbitrum RPC (Alchemy vs Infura vs Arbitrum's native) and is there a testnet preference for the demo (Arbitrum Sepolia)?

6. **Pledge failure destination list**: what onchain addresses are recognized by judges as legitimate "causes"? Suggest: Gitcoin Grants treasury, a recognized DAO multi-sig, and a burn address.

---

## APPENDIX: FONT IMPORTS

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
```

## APPENDIX: TAILWIND CONFIG EXTENSIONS

```js
// tailwind.config.js extensions
theme: {
  extend: {
    colors: {
      'float-void':       '#0A0A0F',
      'float-surface':    '#111118',
      'float-surface-2':  '#1C1C26',
      'float-border':     '#2A2A38',
      'float-muted':      '#4A4A62',
      'float-body':       '#C8C8DC',
      'float-heading':    '#F0F0FF',
      'float-signal':     '#7B6EF6',
      'float-signal-dim': '#3D3680',
      'float-positive':   '#3DD68C',
      'float-warning':    '#F5A623',
      'float-danger':     '#F55C5C',
    },
    fontFamily: {
      display: ['Syne', 'sans-serif'],
      body:    ['Inter', 'sans-serif'],
      mono:    ['JetBrains Mono', 'monospace'],
    },
  }
}
```

---

*FLOAT — Built for UXmaxx Hackathon. Particle Network + Arbitrum + Magic Labs. Solo build by @winsznx.*

*"Crypto has the infrastructure. It just doesn't use it."*
*FLOAT uses it.*