"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { linkFetch } from "@/lib/api";
import { giveWitnessVerdictOnChain } from "@/lib/settle";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";

/**
 * Witness resolution — the only surface that can trigger a slash.
 *
 * Opened from a link with no session. The verdict is recorded here; the
 * on-chain confirmSuccess/confirmFailure is what actually moves the stake.
 */

type PledgeView = {
  id: string;
  goal: string;
  stake_amount: number;
  deadline_unix: number;
  deadline_tz: string;
  status: string;
  failure_destination_label: string;
  onchain_pledge_id: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function WitnessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [pledge, setPledge] = useState<PledgeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"success" | "failure" | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    linkFetch<PledgeView>(`/witness/${token}`)
      .then((data) => {
        if (!cancelled) setPledge(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function give(verdict: "success" | "failure") {
    if (!pledge?.onchain_pledge_id) {
      setError("This pledge isn't locked on-chain yet.");
      return;
    }
    setSubmitting(verdict);
    setError(null);
    try {
      // The stake only moves because of this call — the API records the
      // outcome, it never decides it.
      await giveWitnessVerdictOnChain({
        witnessToken: token,
        onchainPledgeId: pledge.onchain_pledge_id,
        succeeded: verdict === "success",
        email: email || undefined,
      });
      const updated = await linkFetch<PledgeView>(`/witness/${token}`);
      setPledge(updated);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(null);
    }
  }

  if (error && !pledge) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">Link expired</p>
          <p className="mt-3 font-body text-[14px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  if (!pledge) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono text-sm text-muted">Loading</p>
      </main>
    );
  }

  const resolved = pledge.status !== "locked";
  const deadline = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(pledge.deadline_unix * 1000));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">You&apos;re the witness</p>
        <h1 className="mt-2 font-display text-[26px] font-bold text-text">
          Did they make it?
        </h1>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="font-body text-[17px] italic leading-[1.5] text-text">
          &ldquo;{pledge.goal}&rdquo;
        </p>

        <p className="mt-5 font-display text-[28px] font-bold text-signal">
          {formatCurrency(pledge.stake_amount)} at stake
        </p>

        <p className="mt-2 font-body text-[13px] text-coral">
          If they failed → {pledge.failure_destination_label}
        </p>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-muted-2">
          Due {deadline}
        </p>

        {!resolved && (
          <div className="mt-6 border-t-2 border-border-strong pt-5">
            <label htmlFor="witness-email" className="font-mono text-xs uppercase tracking-wide text-muted">
              Your email
            </label>
            <input
              id="witness-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </div>
        )}

        <ErrorNote message={error} className="mt-5" />

        {resolved ? (
          <p className="mt-6 rounded-md border-2 border-void bg-void-3 px-4 py-3 text-center font-body text-[14px] text-text">
            {pledge.status === "succeeded"
              ? "You confirmed it. The stake goes back to them."
              : `Marked failed. The stake fires to ${pledge.failure_destination_label}.`}
          </p>
        ) : (
          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => give("success")}
              disabled={submitting !== null}
              className="w-full rounded-full border-2 border-void bg-mint px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              {submitting === "success" ? "Confirming" : "They did it"}
            </button>
            <button
              type="button"
              onClick={() => give("failure")}
              disabled={submitting !== null}
              className="w-full rounded-full border-2 border-void bg-coral px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              {submitting === "failure" ? "Recording" : "They didn't"}
            </button>
          </div>
        )}
      </div>
      <Link
        href="/"
        className="text-center font-mono text-[11px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        FLOAT · skin in the game
      </Link>
    </main>
  );
}
