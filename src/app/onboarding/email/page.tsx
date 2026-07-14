"use client";

import { useState } from "react";
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
      <div className="w-full max-w-sm rounded-2xl border border-float-border bg-float-surface p-8">
        {status === "sent" ? (
          <div className="flex flex-col items-center text-center">
            <h1 className="font-display text-[28px] font-bold text-float-heading">
              Check your inbox
            </h1>
            <p className="mt-3 font-body text-[15px] text-float-body">
              Link sent. Check your inbox to continue.
            </p>
            <button
              type="button"
              onClick={handleResend}
              className="mt-6 rounded-md font-body text-[13px] text-float-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
            >
              Resend link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
            <h1 className="font-display text-[28px] font-bold text-float-heading">
              Continue with email
            </h1>
            <p className="mt-3 font-body text-[15px] text-float-body">
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
              className="mt-8 w-full rounded-md border border-float-border bg-float-surface-2 px-4 py-3 font-body text-[15px] text-float-body placeholder:text-float-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
            />

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-4 w-full rounded-full bg-float-signal px-6 py-4 font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending" : "Send link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
