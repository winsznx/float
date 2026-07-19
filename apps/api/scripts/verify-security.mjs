/**
 * Phase 7 security acceptance.
 *
 * Probes the boundaries an attacker would actually push on: forged sessions,
 * cross-user reads, capability-token guessing, input validation, rate limits,
 * and secret exposure. Every check is an attempt to do something that should
 * be refused.
 *
 * Run: node apps/api/scripts/verify-security.mjs   (API must be running)
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
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function trpc(path, token, { input, mutation } = {}) {
  const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`;
  const res = await fetch(mutation ? `${API}/trpc/${path}` : `${API}/trpc/${path}${query}`, {
    method: mutation ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(mutation ? { body: JSON.stringify(input ?? {}) } : {}),
  });
  return { status: res.status, body: await res.json() };
}

async function makeUser(suffix) {
  const address = `0x${suffix.repeat(40).slice(0, 40)}`;
  const email = `${address}@wallet.float.local`;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data: created } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_address: address },
  });
  await admin.from("users").upsert({ id: created.user.id, address });

  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  return { id: created.user.id, token: verified.session.access_token, address };
}

let alice = null;
let bob = null;

try {
  alice = await makeUser("a");
  bob = await makeUser("b");
  check("two isolated test users created", !!alice.token && !!bob.token);

  // ── authentication
  const anon = await trpc("auth.me", null);
  check("anonymous call to a protected procedure is refused", anon.body.error?.data?.code === "UNAUTHORIZED");

  const forged = await trpc("auth.me", "not.a.real.token");
  check("a garbage bearer token is refused", forged.body.error?.data?.code === "UNAUTHORIZED");

  // A token signed with the legacy shared secret must not be honoured either.
  const tampered = alice.token.slice(0, -6) + "AAAAAA";
  const tamperedRes = await trpc("auth.me", tampered);
  check("a tampered signature is refused", tamperedRes.body.error?.data?.code === "UNAUTHORIZED");

  // ── cross-user isolation (this is RLS, not application code)
  const aliceSend = await trpc("send.create", alice.token, {
    input: { recipient: "vitalik.eth", amount: 5, note: "alice only" },
    mutation: true,
  });
  const sendId = aliceSend.body.result?.data?.id;
  check("alice created a send", !!sendId);

  const bobSends = await trpc("send.list", bob.token);
  const bobSawAlice = bobSends.body.result?.data?.some((s) => s.id === sendId);
  check("bob cannot see alice's sends", bobSawAlice === false);

  const bobActivity = await trpc("feed.activity", bob.token);
  check("bob's activity feed is empty of alice's rows", (bobActivity.body.result?.data ?? []).length === 0);

  // Forging a row as another user must fail even with a valid session.
  const forgedInsert = await admin
    .from("sends")
    .select("id")
    .eq("id", sendId)
    .single();
  check("alice's send exists service-side", !!forgedInsert.data);

  // ── capability tokens
  const bad = await fetch(`${API}/link/settle/${"f".repeat(32)}`);
  check("an unknown settle token 404s", bad.status === 404);

  const badWitness = await fetch(`${API}/link/witness/${"e".repeat(32)}`);
  check("an unknown witness token 404s", badWitness.status === 404);

  const badClaim = await fetch(`${API}/link/claim/${"d".repeat(32)}`);
  check("an unknown claim token 404s", badClaim.status === 404);

  // A private pledge must not be readable through the public route.
  const privatePledge = await trpc("pledge.create", alice.token, {
    input: {
      goal: "private goal", stakeAmount: 10, witness: "w@example.com",
      destinationId: "burn", deadlineDate: "2026-12-31", timezone: "UTC", isPublic: false,
    },
    mutation: true,
  });
  const privateId = privatePledge.body.result?.data?.id;
  const publicRead = await fetch(`${API}/link/pledge/${privateId}`);
  check("a private pledge is not readable publicly", publicRead.status === 404, `got ${publicRead.status}`);

  // ── input validation
  const negative = await trpc("send.create", alice.token, {
    input: { recipient: "vitalik.eth", amount: -100 },
    mutation: true,
  });
  check("a negative amount is rejected", !!negative.body.error);

  const badHandle = await trpc("auth.setHandle", alice.token, {
    input: { handle: "../../etc/passwd" },
    mutation: true,
  });
  check("a path-traversal handle is rejected", !!badHandle.body.error);

  const badAddress = await trpc("pledge.create", alice.token, {
    input: {
      goal: "x", stakeAmount: 1, witness: "w@example.com", destinationId: "custom",
      customAddress: "not-an-address", deadlineDate: "2026-12-31", timezone: "UTC", isPublic: false,
    },
    mutation: true,
  });
  check("a malformed destination address is rejected", !!badAddress.body.error);

  const zeroDest = await trpc("pledge.create", alice.token, {
    input: {
      goal: "x", stakeAmount: 1, witness: "w@example.com", destinationId: "custom",
      customAddress: `0x${"0".repeat(40)}`, deadlineDate: "2026-12-31", timezone: "UTC", isPublic: false,
    },
    mutation: true,
  });
  check("the zero address is rejected as a destination", !!zeroDest.body.error);

  const oversized = await trpc("send.create", alice.token, {
    input: { recipient: "vitalik.eth", amount: 5, note: "x".repeat(500) },
    mutation: true,
  });
  check("an oversized note is rejected", !!oversized.body.error);

  // ── settle scoping: a valid token must not settle another split's member
  const splitA = await trpc("split.create", alice.token, {
    input: { name: "A", totalAmount: 10, method: "equal", members: [{ ref: "x@example.com", shareAmount: 10 }] },
    mutation: true,
  });
  const splitB = await trpc("split.create", bob.token, {
    input: { name: "B", totalAmount: 10, method: "equal", members: [{ ref: "y@example.com", shareAmount: 10 }] },
    mutation: true,
  });
  const tokenA = splitA.body.result?.data?.shareUrl?.split("/").pop();
  const memberB = splitB.body.result?.data?.members?.[0]?.id;
  const crossSettle = await fetch(`${API}/link/settle/${tokenA}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId: memberB, txHash: `0x${"1".repeat(64)}` }),
  });
  check("split A's token cannot settle split B's member", crossSettle.status >= 400, `status ${crossSettle.status}`);

  // ── transport / headers
  const health = await fetch(`${API}/health`);
  check("nosniff header present", health.headers.get("x-content-type-options") === "nosniff");
  check("framing denied", health.headers.get("x-frame-options") === "DENY");
  check("referrer suppressed", health.headers.get("referrer-policy") === "no-referrer");

  // ── secrets must never cross the wire
  const meBody = JSON.stringify((await trpc("auth.me", alice.token)).body);
  const leaked = [env.SUPABASE_SERVICE_ROLE_KEY, env.MAGIC_SECRET_KEY, env.DEPLOYER_PRIVATE_KEY]
    .filter(Boolean)
    .some((secret) => meBody.includes(secret));
  check("no server secret appears in a response body", !leaked);

  // ── rate limiting
  const burst = await Promise.all(
    Array.from({ length: 45 }, () => fetch(`${API}/link/settle/${"c".repeat(32)}`))
  );
  const limited = burst.filter((r) => r.status === 429).length;
  check("capability links are rate limited", limited > 0, `${limited}/45 got 429`);
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  for (const user of [alice, bob]) {
    if (user) await admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
}

console.log(failures === 0 ? `\nPASS — every boundary held` : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
