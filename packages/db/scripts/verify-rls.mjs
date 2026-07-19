#!/usr/bin/env node
// RLS verification against the real FLOAT Supabase project.
//
// Creates two throwaway auth users, exercises every policy boundary with their
// real JWTs (plus anon), asserts the expected allow/deny on each, then deletes
// both users — cascades wipe every row they created, so the database is left
// exactly as found. Rerunnable at any time; exits non-zero on any violation.
//
// This is verification tooling, not seed data: nothing survives the run.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = { ...loadEnv(resolve(repoRoot, ".env.local")), ...process.env };
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  ok " : "FAIL "} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
}

async function api(path, { method = "GET", token, body, prefer } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body (204 etc.) */
  }
  return { status: res.status, json };
}

async function admin(path, { method = "GET", body } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 201/204 with empty body */
  }
  return { status: res.status, json };
}

async function createAuthUser(email, password) {
  const { status, json } = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: { email, password, email_confirm: true },
  });
  if (status !== 200 && status !== 201) throw new Error(`create ${email}: ${status} ${JSON.stringify(json)}`);
  return json.id;
}

async function signIn(email, password) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`sign in ${email}: ${JSON.stringify(json)}`);
  return json.access_token;
}

const suffix = randomUUID().slice(0, 8);
const emailA = `rls-verify-a-${suffix}@example.com`;
const emailB = `rls-verify-b-${suffix}@example.com`;
const password = randomUUID();

let idA, idB;
try {
  idA = await createAuthUser(emailA, password);
  idB = await createAuthUser(emailB, password);
  const jwtA = await signIn(emailA, password);
  const jwtB = await signIn(emailB, password);

  // ── users ──
  let r = await api("/rest/v1/users", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { id: idA, handle: `rlsa${suffix}` },
  });
  check("A inserts own users row", r.status === 201, `status ${r.status} ${JSON.stringify(r.json)}`);

  r = await api("/rest/v1/users", {
    method: "POST", token: jwtB, prefer: "return=representation",
    body: { id: idB, handle: `rlsb${suffix}` },
  });
  check("B inserts own users row", r.status === 201, `status ${r.status}`);

  r = await api("/rest/v1/users", {
    method: "POST", token: jwtB, prefer: "return=representation",
    body: { id: idA, handle: `steal${suffix}` },
  });
  check("B CANNOT insert a row as A", r.status === 403 || r.status === 409, `status ${r.status}`);

  r = await api("/rest/v1/users?select=id", { token: jwtB });
  check("B sees exactly one users row (own)", r.status === 200 && r.json.length === 1 && r.json[0].id === idB,
    `saw ${r.json?.length} rows`);

  r = await api(`/rest/v1/users?id=eq.${idA}`, {
    method: "PATCH", token: jwtB, prefer: "return=representation",
    body: { handle: `hijack${suffix}` },
  });
  check("B's update of A's row touches 0 rows", r.status === 200 && r.json.length === 0, `touched ${r.json?.length}`);

  r = await api("/rest/v1/users?select=id", {});
  check("anon sees zero users rows", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);

  // ── sends ──
  r = await api("/rest/v1/sends", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { sender_id: idA, recipient_input: "tim.eth", recipient_type: "ens", amount: 50 },
  });
  check("A inserts own send", r.status === 201, `status ${r.status} ${JSON.stringify(r.json)}`);
  const sendId = r.json?.[0]?.id;

  r = await api("/rest/v1/sends", {
    method: "POST", token: jwtB, prefer: "return=representation",
    body: { sender_id: idA, recipient_input: "x@example.com", recipient_type: "email", amount: 10 },
  });
  check("B CANNOT insert a send as A", r.status === 403, `status ${r.status}`);

  r = await api("/rest/v1/sends?select=id", { token: jwtB });
  check("B sees zero of A's sends", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);

  // Recipient linkage: service role marks B the recipient; B should now see it.
  r = await admin(`/rest/v1/sends?id=eq.${sendId}`, {
    method: "PATCH",
    body: { recipient_user_id: idB },
  });
  r = await api("/rest/v1/sends?select=id", { token: jwtB });
  check("B sees the send once made recipient", r.status === 200 && r.json.length === 1, `saw ${r.json?.length}`);

  // ── activity: no client insert policy ──
  r = await api("/rest/v1/activity", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { user_id: idA, type: "send_sent", ref_type: "send", ref_id: sendId },
  });
  check("A CANNOT insert activity directly", r.status === 403, `status ${r.status}`);

  r = await admin("/rest/v1/activity", { method: "POST", body: { user_id: idA, type: "send_sent", ref_type: "send", ref_id: sendId } });
  r = await api("/rest/v1/activity?select=id", { token: jwtA });
  check("A reads own activity (service-role written)", r.status === 200 && r.json.length === 1, `saw ${r.json?.length}`);
  r = await api("/rest/v1/activity?select=id", { token: jwtB });
  check("B sees zero of A's activity", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);

  // ── notifications ──
  await admin("/rest/v1/notifications", { method: "POST", body: { user_id: idA, type: "test", payload: {} } });
  r = await api("/rest/v1/notifications?select=id", { token: jwtB });
  check("B sees zero of A's notifications", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);
  r = await api("/rest/v1/notifications?select=id,read", { token: jwtA });
  const notifId = r.json?.[0]?.id;
  r = await api(`/rest/v1/notifications?id=eq.${notifId}`, {
    method: "PATCH", token: jwtA, prefer: "return=representation", body: { read: true },
  });
  check("A marks own notification read", r.status === 200 && r.json.length === 1 && r.json[0].read === true,
    `status ${r.status}`);

  // ── pledges: private vs public ──
  const pledgeBase = {
    goal: "rls verification pledge", stake_amount: 25, witness_ref: "wit.eth",
    failure_destination_id: "burn", failure_destination_label: "Burn address",
    deadline_unix: 1900000000, deadline_tz: "Africa/Lagos",
  };
  r = await api("/rest/v1/pledges", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { ...pledgeBase, pledger_id: idA, is_public: false },
  });
  check("A inserts private pledge", r.status === 201, `status ${r.status} ${JSON.stringify(r.json)}`);
  r = await api("/rest/v1/pledges", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { ...pledgeBase, pledger_id: idA, is_public: true },
  });
  check("A inserts public pledge", r.status === 201, `status ${r.status}`);

  r = await api("/rest/v1/pledges?select=id,is_public", { token: jwtB });
  check("B sees only the public pledge", r.status === 200 && r.json.length === 1 && r.json[0].is_public === true,
    `saw ${r.json?.length}`);
  r = await api("/rest/v1/pledges?select=id,is_public", {});
  check("anon sees only the public pledge", r.status === 200 && r.json.length === 1 && r.json[0].is_public === true,
    `saw ${r.json?.length}`);

  // ── splits: member visibility ──
  r = await api("/rest/v1/splits", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { organizer_id: idA, name: "rls dinner", total_amount: 120 },
  });
  check("A creates split", r.status === 201, `status ${r.status}`);
  const splitId = r.json?.[0]?.id;

  r = await api("/rest/v1/splits?select=id", { token: jwtB });
  check("B sees zero splits before membership", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);

  r = await api("/rest/v1/split_members", {
    method: "POST", token: jwtB, prefer: "return=representation",
    body: { split_id: splitId, member_ref: "self-invite", share_amount: 40 },
  });
  check("B CANNOT add members to A's split", r.status === 403, `status ${r.status}`);

  r = await api("/rest/v1/split_members", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { split_id: splitId, member_user_id: idB, member_ref: `rlsb${suffix}`, share_amount: 40 },
  });
  check("organizer adds member", r.status === 201, `status ${r.status}`);
  const memberId = r.json?.[0]?.id;

  r = await api("/rest/v1/splits?select=id", { token: jwtB });
  check("B sees the split as a member", r.status === 200 && r.json.length === 1, `saw ${r.json?.length}`);

  r = await api(`/rest/v1/split_members?id=eq.${memberId}`, {
    method: "PATCH", token: jwtB, prefer: "return=representation", body: { settled: true },
  });
  check("B CANNOT self-settle (no update policy)", r.status === 403 || (r.status === 200 && r.json.length === 0),
    `status ${r.status}, touched ${r.json?.length ?? 0}`);

  // ── leashes ──
  r = await api("/rest/v1/leashes", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { owner_id: idA, beneficiary_ref: "sarah@example.com", spend_limit: 500 },
  });
  check("A creates leash", r.status === 201, `status ${r.status}`);
  const leashId = r.json?.[0]?.id;

  r = await api("/rest/v1/leashes?select=id", { token: jwtB });
  check("B sees zero of A's leashes", r.status === 200 && r.json.length === 0, `saw ${r.json?.length}`);

  r = await api("/rest/v1/leash_spends", {
    method: "POST", token: jwtA, prefer: "return=representation",
    body: { leash_id: leashId, amount: 10, to_address: `0x${"ab".repeat(20)}`, tx_hash: "0xdead", log_index: 0 },
  });
  check("even the OWNER cannot insert leash_spends (indexer-only)", r.status === 403, `status ${r.status}`);
} finally {
  // Cascade wipes every row the throwaway users created.
  if (idA) await admin(`/auth/v1/admin/users/${idA}`, { method: "DELETE" });
  if (idB) await admin(`/auth/v1/admin/users/${idB}`, { method: "DELETE" });
}

// Confirm cleanup actually cascaded.
{
  const remaining = await admin(`/rest/v1/users?select=id&id=in.(${idA},${idB})`);
  check("cleanup: throwaway users cascaded away", remaining.json.length === 0, `${remaining.json.length} left`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
