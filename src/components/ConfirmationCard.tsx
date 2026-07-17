"use client";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type ConfirmationCardProps = {
  amount: number;
  recipientLabel: string;
  sourceChain: string;
  destinationChain: string;
  onConfirm: () => void;
  confirming: boolean;
};

export function ConfirmationCard({
  amount,
  recipientLabel,
  sourceChain,
  destinationChain,
  onConfirm,
  confirming,
}: ConfirmationCardProps) {
  return (
    <div className="w-full rounded-2xl border border-float-border bg-float-surface p-8">
      <p className="font-body text-xs uppercase tracking-wide text-float-muted">
        Sending
      </p>

      <p className="mt-3 font-display text-2xl font-bold text-float-heading">
        {formatCurrency(amount)} USDC
      </p>

      <div className="mt-6 flex flex-col gap-1">
        <p className="font-body text-[13px] text-float-body">
          <span className="text-float-muted uppercase tracking-wide">To</span>{" "}
          {recipientLabel}
        </p>
        <p className="font-body text-[13px] text-float-body">
          <span className="text-float-muted uppercase tracking-wide">
            From
          </span>{" "}
          your balance ({sourceChain} to {destinationChain})
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <p className="font-body text-[13px] text-float-muted">
          Gas: $0.00 (sponsored)
        </p>
        <p className="font-body text-[13px] text-float-muted">
          Estimated: ~8 seconds
        </p>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming}
        className="mt-8 w-full rounded-full bg-float-signal px-6 py-4 font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
      >
        {confirming ? "Sending" : "Confirm & Send"}
      </button>
    </div>
  );
}
