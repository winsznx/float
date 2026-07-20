"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/auth";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";

/**
 * Email sign-in.
 *
 * Magic uses a one-time CODE, not a magic link: calling loginWithEmailOTP
 * opens Magic's own modal, the user types the six digits there, and the promise
 * resolves only once that succeeds. So by the time we're past the await the
 * user is fully signed in — there is no "check your inbox" waiting state, and
 * showing one strands them on a dead end after a successful login.
 */
export default function OnboardingEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    setError(null);

    try {
      await signInWithEmail(email);

      // Returning users already have a handle and belong straight in the app;
      // new ones still need to pick one.
      let hasHandle = false;
      try {
        const me = await api.auth.me.query();
        hasHandle = !!me?.handle;
      } catch {
        // A profile read failure shouldn't block a successful sign-in — send
        // them through identity setup, which is safe either way.
      }

      router.push(hasHandle ? "/home" : "/onboarding/identity");
    } catch (caught) {
      // Covers a closed modal, a wrong code, and an expired one.
      setError(getErrorMessage(caught));
      setBusy(false);
    }
  }

  /**
   * Escape hatch. A half-finished Magic session used to be unrecoverable from
   * the UI — clearing it required devtools.
   */
  async function startOver() {
    setError(null);
    setBusy(false);
    try {
      const { signOut } = await import("@/lib/auth");
      await signOut();
    } catch {
      // Nothing to clear.
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] rounded-[22px] border-2 border-void bg-surface p-9 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
          <h1 className="font-display text-[26px] font-bold text-text">
            Continue with email
          </h1>
          <p className="mt-3 font-body text-[14px] leading-[1.5] text-muted">
            We&apos;ll send a code. No password. No seed phrase.
          </p>

          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-7 w-full rounded-xl border-2 border-void bg-void-3 px-[18px] py-3.5 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          />

          <ErrorNote message={error} className="mt-4 w-full text-left" />

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            {busy ? "Check your email for a code" : "Continue"}
          </button>

          {busy && (
            <p className="mt-4 font-body text-[13px] text-muted">
              Enter the six-digit code in the Magic window.
            </p>
          )}

          <button
            type="button"
            onClick={startOver}
            className="mt-6 font-mono text-[12px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            Stuck? Sign out and start over
          </button>
        </form>
      </div>
    </main>
  );
}
