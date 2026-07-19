"use client";

import { useEffect, useState, use } from "react";
import { linkFetch } from "@/lib/api";
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

  if (error) {
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

      <p className="text-center font-mono text-[11px] text-muted-2">
        FLOAT · their key, your rules
      </p>
    </main>
  );
}
