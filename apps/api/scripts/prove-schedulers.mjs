/**
 * Gate D observable proofs against the deployed cron (fires every minute):
 *
 *  1. At-deadline witness notification: the keeper-subject pledge is locked
 *     with its deadline in the past, so the first tick must notify its
 *     FLOAT-user witness and write the witness_notified_deadline ledger row.
 *  2. T-24h reminder: a pledge due today gets witness_reminded_24h.
 *  3. Send reconciler: a submitted send row whose transactionId is already
 *     FINISHED on Particle flips to confirmed with no client involved.
 */
import { createClient } from "@supabase/supabase-js";
import { UniversalAccount } from "@particle-network/universal-account-sdk";
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

const API = process.env.API_URL ?? "https://float-api.timjosh507.workers.dev";
const KEEPER_SUBJECT = "0063f654-4abd-4847-9091-ef81fb206ecf";
const OWNER = "0x88b59c52c90a257111c3e6bb32f1983410e63a84";
const COUNTERPARTY = "0xaee48bd1467e3b7882281c9533dbd89865225153";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function mintSession() {
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: `${OWNER}@wallet.float.local`,
  });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  return verified.session.access_token;
}

const waitFor = async (label, fn, ms = 180_000, step = 10_000) => {
  const startedAt = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() - startedAt > ms) return null;
    await new Promise((r) => setTimeout(r, step));
  }
};

let reminderPledgeId = null;
try {
  const token = await mintSession();

  // Artifact for the T-24h reminder: due today, FLOAT-user witness.
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API}/trpc/pledge.create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      goal: "scheduler reminder proof",
      stakeAmount: 0.01,
      witness: COUNTERPARTY,
      destinationId: "burn",
      deadlineDate: today,
      timezone: "UTC",
      isPublic: false,
    }),
  });
  reminderPledgeId = (await res.json()).result?.data?.id ?? null;
  check("reminder-window pledge created (due today)", !!reminderPledgeId, reminderPledgeId);

  // Artifact for the reconciler: the deployer UA's latest FINISHED transfer,
  // recorded as a submitted send row the way the app records one.
  const ua = new UniversalAccount({
    projectId: env.NEXT_PUBLIC_PARTICLE_PROJECT_ID,
    projectClientKey: env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY,
    projectAppUuid: env.NEXT_PUBLIC_PARTICLE_APP_ID,
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "2.0.1",
      ownerAddress: OWNER,
      useEIP7702: true,
    },
  });
  const history = await ua.getTransactions(1, 5);
  const finished = (history?.transactions ?? history?.data ?? history ?? []).find?.(
    (t) => t?.transactionId
  );
  check("found a real UA transaction to reconcile", !!finished?.transactionId, finished?.transactionId);

  let sendRowId = null;
  if (finished?.transactionId) {
    const sendRes = await fetch(`${API}/trpc/send.create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recipient: COUNTERPARTY,
        amount: 0.05,
        note: "scheduler reconcile proof",
        txHash: finished.transactionId,
      }),
    });
    const sendBody = await sendRes.json();
    sendRowId = sendBody.result?.data?.id ?? null;
    check(
      "send row written as submitted",
      sendBody.result?.data?.status === "submitted",
      sendRowId
    );
  }

  console.log("waiting for cron ticks…");

  const deadlineNote = await waitFor("deadline notification", async () => {
    const { data } = await admin
      .from("pledge_events")
      .select("id")
      .eq("pledge_id", KEEPER_SUBJECT)
      .eq("event_type", "witness_notified_deadline")
      .maybeSingle();
    return data ?? null;
  });
  check("at-deadline: witness_notified_deadline ledger row written", !!deadlineNote);

  const { data: witnessUser } = await admin
    .from("users")
    .select("id")
    .eq("address", COUNTERPARTY)
    .single();
  const { data: witnessNotes } = await admin
    .from("notifications")
    .select("payload")
    .eq("user_id", witnessUser.id)
    .eq("type", "witness_request")
    .order("created_at", { ascending: false })
    .limit(5);
  const gotDeadlineNote = (witnessNotes ?? []).some(
    (n) => n.payload?.phase === "witness_notified_deadline"
  );
  check("at-deadline: FLOAT-user witness got the in-app notification", gotDeadlineNote);

  const reminder = await waitFor("24h reminder", async () => {
    if (!reminderPledgeId) return null;
    const { data } = await admin
      .from("pledge_events")
      .select("id")
      .eq("pledge_id", reminderPledgeId)
      .eq("event_type", "witness_reminded_24h")
      .maybeSingle();
    return data ?? null;
  });
  check("T-24h: witness_reminded_24h ledger row written", !!reminder);

  if (sendRowId) {
    const flipped = await waitFor("send reconcile", async () => {
      const { data } = await admin
        .from("sends")
        .select("status")
        .eq("id", sendRowId)
        .single();
      return data?.status === "confirmed" ? data : null;
    });
    check("reconciler: submitted send flipped to confirmed, app closed", !!flipped);
    await admin.from("sends").delete().eq("id", sendRowId);
  }
} catch (error) {
  check(`unexpected: ${error.message}`, false);
} finally {
  if (reminderPledgeId) await admin.from("pledges").delete().eq("id", reminderPledgeId);
}

console.log(failures === 0 ? "\nPASS — schedulers observable in production" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
