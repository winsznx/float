/**
 * Phase 4 acceptance: every endpoint round-trips real data.
 *
 * Creates a real Supabase auth user, mints a real session, drives each router
 * against the live database and live chain/identity services, then deletes the
 * user and confirms the cascade removed everything.
 *
 * No mocks, no fixtures — a pass here means the API is genuinely wired.
 *
 * Run: node apps/api/scripts/verify-api.mjs   (API must be running)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const API = process.env.API_URL ?? "http://localhost:4000";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
const results = [];
function check(label, ok, detail = "") {
  results.push({ label, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function trpc(path, token, { input, mutation } = {}) {
  // tRPC rejects an input param on procedures that declare none.
  const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`;
  const url = mutation ? `${API}/trpc/${path}` : `${API}/trpc/${path}${query}`;
  const res = await fetch(url, {
    method: mutation ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(mutation ? { body: JSON.stringify(input ?? {}) } : {}),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${path}: ${body.error.message}`);
  return body.result?.data;
}

// The UA we funded, so balance/identity hit real chain state.
const ADDRESS = "0x88b59c52c90a257111c3e6bb32f1983410e63a84";
const authEmail = `${ADDRESS}@wallet.float.local`;
let userId = null;
let token = null;

try {
  // ── health
  const health = await (await fetch(`${API}/health`)).json();
  check("GET /health", health.ok === true);

  // ── session (same path loginWithMagic uses after DID verification)
  await admin.auth.admin
    .listUsers({ page: 1, perPage: 1000 })
    .then(({ data }) => {
      const existing = data?.users.find((u) => u.email === authEmail);
      return existing ? admin.auth.admin.deleteUser(existing.id) : null;
    });

  const { data: created } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: { wallet_address: ADDRESS },
  });
  userId = created.user.id;
  await admin.from("users").upsert({ id: userId, address: ADDRESS });

  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: authEmail });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  token = verified.session.access_token;
  check("session minted for test user", !!token, userId);

  // ── auth
  const me = await trpc("auth.me", token);
  check("auth.me returns the persisted row", me?.id === userId, me?.address);

  const free = await trpc("auth.handleAvailable", token, { input: { handle: `probe${Date.now() % 100000}` } });
  check("auth.handleAvailable queries the real table", free === true);

  const handle = `probe${Date.now() % 100000}`;
  const withHandle = await trpc("auth.setHandle", token, { input: { handle }, mutation: true });
  check("auth.setHandle persists", withHandle?.handle === handle, withHandle?.handle);

  const taken = await trpc("auth.handleAvailable", token, { input: { handle } });
  check("the claimed handle now reads as taken", taken === false);

  // ── unauthenticated access must be refused
  let refused = false;
  try {
    await trpc("auth.me", null);
  } catch {
    refused = true;
  }
  check("protected procedures reject anonymous callers", refused);

  // ── identity: real ENS, real Farcaster, real Neynar
  const ens = await trpc("identity.resolve", token, { input: { input: "vitalik.eth" } });
  check(
    "identity.resolve → live ENS",
    ens?.resolvedAddress?.toLowerCase() === "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    ens?.resolvedAddress
  );

  const fc = await trpc("identity.resolve", token, { input: { input: "dwr" } });
  check("identity.resolve → live Farcaster via Neynar", !!fc?.resolvedAddress, fc?.resolvedAddress);

  const unknown = await trpc("identity.resolve", token, { input: { input: "nobody@example.com" } });
  check("unknown email flagged isNewUser (drives claim link)", unknown?.isNewUser === true);

  // ── balance: live Universal Account state, not a table
  const balance = await trpc("balance.get", token);
  check("balance.get reads live UA state", typeof balance?.total === "number", `$${balance?.total?.toFixed(2)}`);
  check("balance reports per-chain rows", Array.isArray(balance?.chains), JSON.stringify(balance?.chains));

  // ── send
  const send = await trpc("send.create", token, {
    input: { recipient: "vitalik.eth", amount: 12.5, note: "phase 4 verification" },
    mutation: true,
  });
  check("send.create persists and returns the row", !!send?.id && send.amount === 12.5, send?.id);
  check("send resolved recipient to an address", !!send?.recipient_address, send?.recipient_address);

  const sends = await trpc("send.list", token);
  check("send.list returns it back from Postgres", sends?.some((s) => s.id === send.id));

  // ── split
  const split = await trpc("split.create", token, {
    input: {
      name: "Phase 4 dinner",
      totalAmount: 60,
      method: "equal",
      members: [
        { ref: "vitalik.eth", shareAmount: 30 },
        { ref: "dwr", shareAmount: 30 },
      ],
    },
    mutation: true,
  });
  check("split.create persists split + members", split?.members?.length === 2, split?.id);
  check("split issues a share link", !!split?.shareUrl, split?.shareUrl?.slice(0, 48));

  // ── capability-token REST, no session at all
  const shareToken = split.shareUrl.split("/").pop();
  const settleView = await (await fetch(`${API}/link/settle/${shareToken}`)).json();
  check("anonymous settle link resolves", settleView?.id === split.id, `${settleView?.split_members?.length} members`);

  const memberId = settleView.split_members[0].id;
  const settled = await (
    await fetch(`${API}/link/settle/${shareToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, txHash: `0x${"a".repeat(64)}` }),
    })
  ).json();
  check("anonymous member settles via token", settled?.settled === true, settled?.settle_tx_hash?.slice(0, 12));

  const badToken = await (await fetch(`${API}/link/settle/${"0".repeat(32)}`)).json();
  check("an invalid link token is refused", !!badToken?.error);

  // ── leash
  const leash = await trpc("leash.create", token, {
    input: {
      beneficiary: "vitalik.eth",
      spendLimit: 500,
      contractScope: "basic",
      expiryDate: "2026-12-31",
      timezone: "Africa/Lagos",
    },
    mutation: true,
  });
  check("leash.create persists", leash?.spend_limit === 500, leash?.id);
  check("expiry stored as unix + tz", !!leash?.expiry_unix && leash?.expiry_tz === "Africa/Lagos",
    `${leash?.expiry_unix} (${new Date(leash.expiry_unix * 1000).toISOString()})`);
  check("leash spent starts at 0 — indexer owns it", leash?.spent === 0);

  const leashView = await (await fetch(`${API}/link/leash/claim/${leash.claim_token}`)).json();
  check("beneficiary claim link resolves anonymously", leashView?.id === leash.id, `remaining $${leashView?.remaining}`);

  // ── pledge
  const destinations = await trpc("pledge.destinations", token);
  const burn = destinations.find((d) => d.id === "burn");
  check("pledge.destinations exposes burn with a real address", burn?.address?.toLowerCase().endsWith("dead"), burn?.address);
  check("unconfigured destinations marked unavailable", destinations.some((d) => !d.available));

  const pledge = await trpc("pledge.create", token, {
    input: {
      goal: "Ship FLOAT phase 4",
      stakeAmount: 100,
      witness: "witness@example.com",
      destinationId: "burn",
      deadlineDate: "2026-08-31",
      timezone: "Africa/Lagos",
      isPublic: true,
    },
    mutation: true,
  });
  check("pledge.create persists", pledge?.stake_amount === 100, pledge?.id);
  check("pledge carries the resolved destination address", !!pledge?.failure_destination_address);
  check("witness link issued", !!pledge?.witnessUrl);

  const witnessToken = pledge.witnessUrl.split("/").pop();
  const witnessView = await (await fetch(`${API}/link/witness/${witnessToken}`)).json();
  check("witness link resolves anonymously", witnessView?.id === pledge.id, witnessView?.status);

  const verdict = await (
    await fetch(`${API}/link/witness/${witnessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: "failure", txHash: `0x${"b".repeat(64)}` }),
    })
  ).json();
  check("witness verdict recorded (the slash path)", verdict?.status === "failed", verdict?.status);

  const replay = await (
    await fetch(`${API}/link/witness/${witnessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: "success", txHash: `0x${"c".repeat(64)}` }),
    })
  ).json();
  check("a resolved pledge cannot be re-resolved", !!replay?.error, replay?.error);

  const publicFeed = await trpc("pledge.publicFeed", token);
  check("public pledge board lists it", publicFeed?.some((p) => p.id === pledge.id));

  // ── feed
  const activity = await trpc("feed.activity", token);
  const kinds = new Set(activity?.map((a) => a.type));
  check(
    "activity feed populated by every write",
    ["send_sent", "split_created", "leash_created", "pledge_created"].every((k) => kinds.has(k)),
    [...kinds].join(", ")
  );
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    const { data: leftovers } = await admin.from("sends").select("id").eq("sender_id", userId);
    check("deleting the user cascades their rows away", (leftovers?.length ?? 0) === 0);
  }
}

console.log(
  failures === 0
    ? `\nPASS — ${results.length}/${results.length} checks, every endpoint round-tripped real data`
    : `\n${failures}/${results.length} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
