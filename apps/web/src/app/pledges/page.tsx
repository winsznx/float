"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

/**
 * The public accountability board: every pledge whose owner chose to make it
 * public, anon-readable. Visible stakes are the point — a goal with money and
 * a witness behind it reads differently from a resolution.
 */

type FeedPledge = {
  id: string;
  goal: string;
  stake_amount: number;
  deadline_unix: number;
  status: string;
  failure_destination_label: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PublicPledgeBoardPage() {
  const [pledges, setPledges] = useState<FeedPledge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.pledge.publicFeed
      .query()
      .then((rows) => {
        if (!cancelled) setPledges(rows);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">FLOAT</p>
        <h1 className="mt-2 font-display text-[28px] font-bold text-text">
          Skin in the game
        </h1>
        <p className="mt-2 font-body text-[14px] text-muted">
          Public pledges, real stakes, on-chain.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-void bg-surface p-6 shadow-[5px_5px_0_0_var(--color-brut-line)]">
          <p className="font-body text-[14px] text-coral">{error}</p>
        </div>
      )}

      {!error && pledges === null && (
        <p className="font-mono text-sm text-muted">Loading</p>
      )}

      {pledges?.length === 0 && (
        <div className="rounded-2xl border-2 border-void bg-surface p-6 shadow-[5px_5px_0_0_var(--color-brut-line)]">
          <p className="font-body text-[14px] text-muted">
            Nothing public yet. Lock a pledge and make it public to put it here.
          </p>
        </div>
      )}

      {pledges?.map((pledge) => {
        const statusColor =
          pledge.status === "succeeded"
            ? "text-text"
            : pledge.status === "failed"
              ? "text-coral"
              : "text-signal";
        const deadline = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(pledge.deadline_unix * 1000));

        return (
          <Link
            key={pledge.id}
            href={`/pledge/${pledge.id}`}
            className="block rounded-2xl border-2 border-void bg-surface p-6 shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-[20px] font-bold text-signal">
                {formatCurrency(pledge.stake_amount)}
              </p>
              <p className={`font-mono text-xs uppercase tracking-wide ${statusColor}`}>
                {pledge.status}
              </p>
            </div>
            <p className="mt-3 font-body text-[15px] italic leading-[1.5] text-text">
              &ldquo;{pledge.goal}&rdquo;
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted-2">
              Due {deadline} · Failure → {pledge.failure_destination_label}
            </p>
          </Link>
        );
      })}

      <Link
        href="/"
        className="mt-2 w-full rounded-full border-2 border-void bg-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        Put something on the line
      </Link>
    </main>
  );
}
