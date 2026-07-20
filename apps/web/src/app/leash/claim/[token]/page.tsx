"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { linkFetch } from "@/lib/api";
import { spendFromLeashOnChain } from "@/lib/settle";
import { ErrorNote } from "@/components/ErrorNote";
import { getErrorMessage } from "@/lib/errors";

/**
 * Leash beneficiary claim — "you've been given a spending key".
 *
 * Opened from a link with no session. Shows the limits the owner set and how
 * much authority is left, all read straight from the row the indexer keeps in
 * sync with the chain.
 */

type LeashView = {
  id: string;
  beneficiary_ref: string;
  token: string;
  spend_limit: number;
  spent: number;
  remaining: number;
  expiry_unix: number | null;
  expiry_tz: string | null;
  revoked: boolean;
  contract_scope: string;
  onchain_leash_id: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LeashClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [leash, setLeash] = useState<LeashView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [email, setEmail] = useState("");
  const [spending, setSpending] = useState(false);
  const [spentTx, setSpentTx] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    linkFetch<LeashView>(`/leash/claim/${token}`)
      .then((data) => {
        if (!cancelled) setLeash(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function spend() {
    if (!leash?.onchain_leash_id) {
      setError("This leash isn't on-chain yet.");
      return;
    }
    setSpending(true);
    setError(null);
    try {
      const { txHash } = await spendFromLeashOnChain({
        leashId: leash.onchain_leash_id,
        amount: Number(amount),
        to,
        email: email || undefined,
      });
      setSpentTx(txHash);
      // Re-read so the remaining balance reflects what the indexer recorded.
      const refreshed = await linkFetch<LeashView>(`/leash/claim/${token}`);
      setLeash(refreshed);
      setAmount("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSpending(false);
    }
  }

  if (error && !leash) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">No longer active</p>
          <p className="mt-3 font-body text-[14px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  if (!leash) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono text-sm text-muted">Loading</p>
      </main>
    );
  }

  const used = leash.spend_limit > 0 ? Math.min(leash.spent / leash.spend_limit, 1) : 0;
  const percent = Math.round(used * 100);
  const expiry = leash.expiry_unix
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(leash.expiry_unix * 1000)
      )
    : "No expiry";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">Leash</p>
        <h1 className="mt-2 font-display text-[26px] font-bold text-text">
          You&apos;ve been given a spending key
        </h1>
        <p className="mt-2 font-body text-[14px] text-muted">
          Spend up to the limit below from someone&apos;s balance. They stay in control and can
          revoke at any time.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="font-display text-[32px] font-bold text-text">
          {formatCurrency(leash.remaining)}
          <span className="font-body text-[15px] font-normal text-muted">
            {" "}
            of {formatCurrency(leash.spend_limit)} left
          </span>
        </p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-void bg-void-3">
          <div
            className={`h-full ${percent >= 95 ? "bg-coral" : percent >= 80 ? "bg-signal" : "bg-mint"}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-muted-2">
          Expires {expiry} · {leash.token} only
        </p>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">Spend</p>

        <label htmlFor="spend-amount" className="sr-only">Amount</label>
        <input
          id="spend-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" || /^\d*\.?\d{0,2}$/.test(next)) setAmount(next);
          }}
          placeholder="0.00"
          className="mt-3 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-display text-[20px] font-bold text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />

        <label htmlFor="spend-to" className="sr-only">Send to</label>
        <input
          id="spend-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x… destination address"
          className="mt-3 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-mono text-[13px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />

        <label htmlFor="spend-email" className="sr-only">Your email</label>
        <input
          id="spend-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-3 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[14px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        />
        <p className="mt-2 font-body text-[12px] text-muted">
          Sign in with the email this leash was sent to.
        </p>

        <ErrorNote message={error} className="mt-4" />

        {spentTx && (
          <p className="mt-4 rounded-md border-2 border-void bg-mint/25 px-4 py-3 font-body text-[13px] text-text">
            Sent. The owner sees it in their activity feed.
          </p>
        )}

        <button
          type="button"
          onClick={spend}
          disabled={spending || !amount || Number(amount) <= 0 || !/^0x[a-fA-F0-9]{40}$/.test(to)}
          className="mt-4 w-full rounded-full border-2 border-void bg-lav px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {spending ? "Sending" : "Spend"}
        </button>
      </div>

      <Link
        href="/"
        className="text-center font-mono text-[11px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        FLOAT · their key, your rules
      </Link>
    </main>
  );
}
