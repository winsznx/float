import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

/**
 * Test session helper.
 *
 * Magic's OTP can't be automated — the code goes to a real inbox — so tests
 * mint a real Supabase session with the service role and inject it exactly as
 * the app would store it. Everything downstream of authentication is then
 * genuinely exercised: the guard, the API calls, RLS, the UI.
 *
 * That leaves the Magic modal itself as the one untested step, which is the
 * honest boundary of what a headless browser can cover.
 */

const env = Object.fromEntries(
  // process.cwd() rather than import.meta.url: Playwright transpiles specs to
  // CJS, where import.meta is unavailable.
  readFileSync(resolve(process.cwd(), "../../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TestUser = {
  userId: string;
  address: string;
  accessToken: string;
  refreshToken: string;
  handle: string;
};

/** Creates a throwaway user with a real session. */
export async function createTestUser(seed: string): Promise<TestUser> {
  const address = `0x${seed.repeat(40).slice(0, 40)}`;
  const email = `${address}@wallet.float.local`;

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_address: address },
  });
  if (error || !created.user) throw error ?? new Error("could not create test user");

  const handle = `e2e${Date.now().toString().slice(-6)}`;
  await admin.from("users").upsert({ id: created.user.id, address, handle });

  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link!.properties!.hashed_token,
  });

  return {
    userId: created.user.id,
    address,
    accessToken: verified.session!.access_token,
    refreshToken: verified.session!.refresh_token,
    handle,
  };
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  await admin.auth.admin.deleteUser(user.userId).catch(() => {});
}

/** Injects the session before any app script runs. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [
      "float.session",
      JSON.stringify({
        userId: user.userId,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        address: user.address,
      }),
    ]
  );
}

/**
 * Signs in without an init script.
 *
 * signIn() uses addInitScript, which re-runs on every page load — fine for
 * most tests, but it silently re-injects the session after a sign-out, so any
 * test that needs to observe signing out must seed storage this way instead.
 */
export async function signInOnce(page: Page, user: TestUser): Promise<void> {
  await page.goto("/onboarding/email");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [
      "float.session",
      JSON.stringify({
        userId: user.userId,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        address: user.address,
      }),
    ]
  );
}

export { admin };
