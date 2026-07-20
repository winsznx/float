"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

type PledgeCardProps = {
  goal: string;
  stake: number;
  witnessLabel: string;
  failureLabel: string;
  deadline: string;
  status: "review" | "locked";
  isAtRisk?: boolean;
  shareLink?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDeadline(value: string): string {
  if (!value) return "No date set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function PledgeCard({
  goal,
  stake,
  witnessLabel,
  failureLabel,
  deadline,
  status,
  isAtRisk = false,
  shareLink,
}: PledgeCardProps) {
  const stakeColor = isAtRisk ? "text-coral" : "text-signal";
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleShare() {
    if (!shareLink) return;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable over plain HTTP and in some in-app browsers.
      // Say so rather than confirming a copy that never happened.
      setCopyFailed(true);
    }
  }

  return (
    <div className="w-full rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      <div className="flex items-center justify-between border-b-2 border-border-strong pb-4">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Pledge
        </p>
        <div className="flex items-center gap-2">
          {isAtRisk && (
            <span className="rounded-full border-2 border-void bg-coral px-2.5 py-0.5 font-body text-[11px] font-semibold uppercase tracking-wide text-void shadow-[2px_2px_0_0_var(--color-brut-line)]">
              At risk
            </span>
          )}
          {status === "locked" && (
            <span className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wide text-signal">
              Locked
              <Lock aria-hidden="true" size={12} />
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 font-body text-[15px] italic text-text">
        &quot;{goal}&quot;
      </p>

      <p className={`mt-4 font-display text-xl font-bold ${stakeColor}`}>
        {formatCurrency(stake)} at stake
      </p>

      <p className="mt-3 font-body text-sm text-coral">
        Failure to {failureLabel || "no destination set"}
      </p>

      <p
        className={`mt-4 font-mono text-xs ${isAtRisk ? "text-coral" : "text-muted-2"}`}
      >
        Witness: {witnessLabel || "none"} &middot; Due {formatDeadline(deadline)}
      </p>

      {shareLink && (
        <>
          <button
            type="button"
            onClick={handleShare}
            className="mt-6 font-body text-sm font-medium text-text transition-colors hover:text-signal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          >
            {copied ? "Copied" : "Share pledge"}
          </button>
          {copyFailed && (
            <p role="alert" className="mt-2 font-body text-[12px] text-coral">
              Couldn&apos;t copy. Select the link and copy it manually.
            </p>
          )}
        </>
      )}
    </div>
  );
}
