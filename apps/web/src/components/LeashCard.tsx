"use client";

type LeashCardProps = {
  beneficiaryLabel: string;
  spendLimit: number;
  used: number;
  expiry: string;
  variant: "review" | "active";
  onRevoke?: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatExpiry(value: string): string {
  if (!value) return "No date set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function LeashCard({
  beneficiaryLabel,
  spendLimit,
  used,
  expiry,
  variant,
  onRevoke,
}: LeashCardProps) {
  const ratio = spendLimit > 0 ? Math.min(used / spendLimit, 1) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div className="w-full rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      <div className="flex items-center justify-between border-b-2 border-border-strong pb-4">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          Leash
        </p>
        {variant === "active" && (
          <span className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wide text-muted">
            Live
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
        )}
      </div>

      <p className="mt-4 font-body text-[17px] font-medium text-text">
        {beneficiaryLabel || "No beneficiary set"}
      </p>

      <div className="mt-6">
        <p className="font-body text-sm text-text">
          {formatCurrency(used)} used{" "}
          <span className="text-muted">/ {formatCurrency(spendLimit)} limit</span>
        </p>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border-2 border-void bg-void-3">
          <div
            className="h-full rounded-full bg-mint transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-right font-mono text-[11px] text-muted-2">
          {percent}%
        </p>
      </div>

      <p className="mt-6 font-mono text-xs text-muted-2">
        Expires: {formatExpiry(expiry)} &middot; USDC only
      </p>

      {variant === "active" && onRevoke && (
        <button
          type="button"
          onClick={onRevoke}
          className="mt-6 font-body text-sm font-medium text-coral transition-colors hover:text-coral/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
        >
          Revoke
        </button>
      )}
    </div>
  );
}
