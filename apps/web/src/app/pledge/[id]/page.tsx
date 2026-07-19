"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { linkFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

/**
 * Public accountability card. Only pledges explicitly marked public resolve
 * here — the API 404s everything else, so a private pledge can't be read by
 * guessing its id.
 */

type PublicPledge = {
  id: string;
  goal: string;
  stake_amount: number;
  token: string;
  deadline_unix: number;
  status: string;
  failure_destination_label: string;
  pledgerHandle: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PublicPledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pledge, setPledge] = useState<PublicPledge | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    linkFetch<PublicPledge>(`/pledge/${id}`)
      .then((data) => {
        if (!cancelled) setPledge(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">Not public</p>
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

  const deadline = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(pledge.deadline_unix * 1000));

  const statusCopy =
    pledge.status === "succeeded"
      ? "They did it. Stake returned."
      : pledge.status === "failed"
        ? `Missed. Stake fired to ${pledge.failure_destination_label}.`
        : "Locked. Still on the hook.";

  const statusColor =
    pledge.status === "succeeded"
      ? "text-text"
      : pledge.status === "failed"
        ? "text-coral"
        : "text-signal";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <div className="flex items-center justify-between border-b-2 border-border-strong pb-4">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">Pledge</p>
          <p className={`font-mono text-xs uppercase tracking-wide ${statusColor}`}>
            {pledge.status}
          </p>
        </div>

        <p className="mt-6 font-body text-[18px] italic leading-[1.5] text-text">
          &ldquo;{pledge.goal}&rdquo;
        </p>

        <p className="mt-6 font-display text-[36px] font-bold text-signal">
          {formatCurrency(pledge.stake_amount)}
          <span className="ml-2 font-body text-[15px] font-normal text-muted">at stake</span>
        </p>

        <p className={`mt-4 font-body text-[14px] ${statusColor}`}>{statusCopy}</p>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-muted-2">
          {pledge.pledgerHandle ? `@${pledge.pledgerHandle} · ` : ""}Due {deadline}
        </p>
      </div>

      <Link
        href="/"
        className="w-full rounded-full border-2 border-void bg-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        Put something on the line
      </Link>
    </main>
  );
}
