"use client";

import { useState } from "react";
import Link from "next/link";
import { sendMagicLink } from "@/lib/auth";

export default function OnboardingEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || status === "submitting") return;
    setStatus("submitting");
    await sendMagicLink(email);
    setStatus("sent");
  }

  async function handleResend() {
    if (status === "submitting") return;
    setStatus("submitting");
    await sendMagicLink(email);
    setStatus("sent");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] rounded-[22px] border-2 border-void bg-surface p-9 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        {status === "sent" ? (
          <div className="flex flex-col items-center text-center">
            <h1 className="font-display text-[26px] font-bold text-text">
              Check your inbox
            </h1>
            <p className="mt-3 font-body text-[14px] leading-[1.5] text-muted">
              Link sent. Check your inbox to continue.
            </p>
            <button
              type="button"
              onClick={handleResend}
              className="mt-7 font-mono text-[13px] text-signal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              Resend link
            </button>

            {/* TODO: remove once real Magic link handling is wired; this only exists so the rest of onboarding is reachable without a live email link. */}
            <Link
              href="/onboarding/identity"
              className="mt-3 font-mono text-[12px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              Continue to identity setup
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
            <h1 className="font-display text-[26px] font-bold text-text">
              Continue with email
            </h1>
            <p className="mt-3 font-body text-[14px] leading-[1.5] text-muted">
              We&apos;ll send a link. No password. No seed phrase.
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
              className="mt-7 w-full rounded-xl border-2 border-void bg-void-3 px-[18px] py-3.5 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            />

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-4 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              {status === "submitting" ? "Sending" : "Send link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
