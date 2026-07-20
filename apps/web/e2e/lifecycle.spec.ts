import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, signIn, signInOnce, admin, type TestUser } from "./session";

/**
 * End-to-end lifecycle.
 *
 * Every bug that reached the user in testing lived between layers: the API
 * suite passed, the security suite passed, and the app was still broken
 * because nothing drove a browser. These tests assert what a person actually
 * experiences — that a guard redirects, that a created thing is still there
 * after a reload, that a button does something.
 *
 * Each case names the regression it exists to prevent.
 */

let user: TestUser;

test.beforeAll(async () => {
  user = await createTestUser("e");
});

test.afterAll(async () => {
  if (user) await deleteTestUser(user);
});

test.describe("unauthenticated", () => {
  test("landing page renders and offers both sign-in paths", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /FLOAT/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /continue with email/i })).toBeVisible();
    // Regression: this was a <Link> to onboarding that skipped auth entirely.
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
  });

  test("app routes redirect when there is no session", async ({ page }) => {
    // Regression: /home rendered an empty dashboard to signed-out visitors.
    for (const route of ["/home", "/send", "/split", "/leash", "/pledge"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/onboarding\/email/, { timeout: 15_000 });
    }
  });

  test("email page asks for a code, not a link", async ({ page }) => {
    // Regression: Magic sends an OTP; the page said "we'll send a link" and
    // then stranded the user on "check your inbox" after a successful login.
    await page.goto("/onboarding/email");
    await expect(page.getByText(/send a code/i)).toBeVisible();
    await expect(page.getByText(/check your inbox/i)).toHaveCount(0);
  });

  test("an invalid capability token is refused, not silently empty", async ({ page }) => {
    await page.goto(`/settle/${"0".repeat(32)}`);
    await expect(page.getByText("Link expired", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, user);
  });

  test("home shows a real balance and reaches the account page", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText(/your balance/i)).toBeVisible({ timeout: 20_000 });

    // Regression: the balance was MOCK_BALANCE = 1247.83.
    await expect(page.getByText("$1,247.83")).toHaveCount(0);

    // Regression: the avatar button went nowhere; there was no account page.
    await page.getByRole("link", { name: /account/i }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(user.address, { exact: false })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("an empty balance offers a deposit address instead of a dead end", async ({ page }) => {
    // Regression: $0.00, empty feed, and every mode needing funds the user had
    // no way to add.
    await page.goto("/home");
    await expect(page.getByText(/add funds|do more/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("send does not offer more than the balance", async ({ page }) => {
    // Regression: MAX_AMOUNT was hardcoded, so MAX offered $1,247.83 of money
    // that did not exist.
    await page.goto("/send");
    await expect(page.getByText("$1,247.83")).toHaveCount(0);
  });

  test("notifications open and are readable", async ({ page }) => {
    // Regression: the bell was a dot with no panel behind it.
    await page.goto("/home");
    await page.getByRole("button", { name: /notification/i }).click();
    await expect(page.getByRole("dialog", { name: /notifications/i })).toBeVisible();
  });

  test("a created leash survives a reload", async ({ page }) => {
    // Regression: every mode was write-only. The list endpoints existed and
    // nothing called them, so a created leash vanished from the UI.
    const { data: leash } = await admin
      .from("leashes")
      .insert({
        owner_id: user.userId,
        beneficiary_ref: "e2e@example.com",
        token: "USDC",
        spend_limit: 250,
        expiry_unix: Math.floor(Date.now() / 1000) + 86_400,
        expiry_tz: "UTC",
      })
      .select()
      .single();

    await page.goto("/leash");
    await expect(page.getByText("e2e@example.com")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("$250.00", { exact: true })).toBeVisible();

    await admin.from("leashes").delete().eq("id", leash!.id);
  });

  test("the account page saves a handle change", async ({ page }) => {
    // Regression: the handle was settable exactly once, during onboarding, and
    // the identity page never actually persisted it.
    // Deliberately unlike the handle createTestUser assigned — an identical
    // one is correctly treated as "no change" and never reports availability.
    const next = `renamed${Date.now().toString().slice(-6)}`;
    await page.goto("/account");
    // The address only renders once auth.me resolves, so this is a reliable
    // signal that the page is hydrated and ready for input.
    await expect(page.getByText(user.address, { exact: false })).toBeVisible({
      timeout: 20_000,
    });

    const input = page.locator("#handle");
    await input.fill(next);
    await expect(page.getByText(/is available/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /save handle/i }).click();
    await expect(page.getByText(/^Saved\.$/)).toBeVisible({ timeout: 20_000 });

    const { data } = await admin.from("users").select("handle").eq("id", user.userId).single();
    expect(data?.handle).toBe(next);
  });

});

test.describe("sign out", () => {
  test("clears the stored session and locks the app again", async ({ page }) => {
    // Seeded without an init script on purpose — see signInOnce.
    await signInOnce(page, user);

    await page.goto("/account");
    await expect(page.getByText(user.address, { exact: false })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /sign out/i }).click();

    // Regression: signing out previously required clearing localStorage by hand.
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("float.session")), {
        timeout: 15_000,
      })
      .toBeNull();

    await page.goto("/home");
    await expect(page).toHaveURL(/onboarding\/email/, { timeout: 15_000 });
  });
});
