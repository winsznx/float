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

  async function handleShare() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      // clipboard unavailable in this environment; nothing to fall back to in this mocked phase
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-full rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      <div className="flex items-center justify-between border-b-2 border-border-strong pb-4">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Pledge
        </p>
        {status === "locked" && (
          <span className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wide text-signal">
            Locked
            <Lock aria-hidden="true" size={12} />
          </span>
        )}
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

      <p className="mt-4 font-mono text-xs text-muted-2">
        Witness: {witnessLabel || "none"} &middot; Due {formatDeadline(deadline)}
      </p>

      {shareLink && (
        <button
          type="button"
          onClick={handleShare}
          className="mt-6 font-body text-sm font-medium text-text transition-colors hover:text-signal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
        >
          {copied ? "Copied" : "Share pledge"}
        </button>
      )}
    </div>
  );
}
