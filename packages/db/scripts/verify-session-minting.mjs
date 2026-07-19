/**
 * Proves the Magic → Supabase session path WITHOUT a legacy JWT secret.
 *
 * The float project has migrated to asymmetric (ECC P-256) JWT signing keys,
 * which demotes the HS256 shared secret to a verify-only "previous key" that
 * Supabase will eventually revoke. Hand-minting HS256 tokens against it would
 * work today and silently break on revocation.
 *
 * Instead Supabase itself mints the session: we create/find the auth user by
 * their wallet-derived email, generate a magiclink token_hash with the service
 * role, and exchange it for a real session via verifyOtp. Signing stays inside
 * Supabase, so the key regime is irrelevant.
 *
 * In production the trigger is a verified Magic DID token; here we drive the
 * same admin calls directly to prove the mechanism end to end.
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

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  console.error("missing Supabase env (URL / anon / service role)");
  process.exit(1);
}

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// A Magic-provisioned wallet address stands in for the real login subject.
const walletAddress = `0x${"5e".repeat(20)}`;
const email = `${walletAddress.toLowerCase()}@wallet.float.local`;

let userId = null;
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

try {
  // 1. Upsert the auth user, exactly as the Magic callback would.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_address: walletAddress, auth_provider: "magic" },
  });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);
  userId = created.user.id;
  check("admin.createUser mints an auth subject", !!userId, userId);

  // 2. Ask Supabase for a one-time token. Supabase signs it with whatever key
  //    regime the project is on, so this needs no JWT secret.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const tokenHash = link.properties?.hashed_token;
  check("admin.generateLink returns a token_hash", !!tokenHash);

  // 3. Exchange it for a real session on an anon client.
  const anonClient = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: otpErr } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);

  const accessToken = session.session?.access_token;
  check("verifyOtp returns a live session", !!accessToken);
  check("session subject matches the created user", session.user?.id === userId);

  // 4. Confirm which key actually signed it, and that our claims survived.
  const header = JSON.parse(Buffer.from(accessToken.split(".")[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
  check(`token signed with ${header.alg}`, true, `kid=${header.kid ?? "n/a"}`);
  check("wallet_address survives into the token", payload.user_metadata?.wallet_address === walletAddress);

  // 5. The real point: this session must satisfy RLS. public.users is written
  //    by the user themselves, keyed to auth.uid().
  const asUser = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: row, error: insErr } = await asUser
    .from("users")
    .insert({ id: userId, address: walletAddress.toLowerCase(), handle: `probe${Date.now().toString().slice(-6)}` })
    .select()
    .single();
  check("session passes RLS on public.users insert", !insErr && !!row, insErr?.message ?? row?.address);

  const { data: readBack } = await asUser.from("users").select("address").eq("id", userId).single();
  check("row reads back under the same session", readBack?.address === walletAddress.toLowerCase());
} catch (err) {
  check(`unexpected: ${err.message}`, false);
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    const { data: gone } = await admin.from("users").select("id").eq("id", userId);
    check("cascade removes the public.users row", (gone?.length ?? 0) === 0);
  }
}

console.log(failures === 0 ? "\nPASS — session minting works with no JWT secret" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
