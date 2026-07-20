"use client";

import type { SendQuote } from "@/lib/send";

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
  /** Where the money actually lands. Null only for unclaimed email sends. */
  recipientAddress: string | null;
  sourceChain: string;
  destinationChain: string;
  /** Particle's quote for this exact transfer. Null when there is none to show. */
  quote: SendQuote | null;
  quoting: boolean;
  onConfirm: () => void;
  confirming: boolean;
};

export function ConfirmationCard({
  amount,
  recipientLabel,
  recipientAddress,
  sourceChain,
  destinationChain,
  quote,
  quoting,
  onConfirm,
  confirming,
}: ConfirmationCardProps) {
  return (
    <div className="w-full rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        Sending
      </p>

      <p className="mt-3 font-display text-2xl font-bold text-text">
        {formatCurrency(amount)} USDC
      </p>

      <div className="mt-6 flex flex-col gap-1">
        <p className="font-body text-[13px] text-text">
          <span className="font-mono text-muted uppercase tracking-wide">
            To
          </span>{" "}
          {recipientLabel}
        </p>
        {/* The final screen before the money is irreversible showed only what
            the sender typed, so a name that resolved somewhere unexpected
            looked identical to one that resolved correctly. */}
        {recipientAddress && (
          <p className="font-mono text-[11px] text-muted-2">{recipientAddress}</p>
        )}
        <p className="font-body text-[13px] text-text">
          <span className="font-mono text-muted uppercase tracking-wide">
            From
          </span>{" "}
          your balance ({sourceChain} to {destinationChain})
        </p>
      </div>

      {/* Gas and cost come from the quote Particle returned for this exact
          transfer. They were previously two literal strings — a sponsorship
          claim and an "~8 seconds" estimate — printed on the last screen before
          the money is irreversible, neither of which anything checked. There is
          no time estimate in the quote, so none is shown. */}
      <div className="mt-6 flex flex-col gap-1" aria-live="polite">
        {quoting && (
          <p className="font-mono text-[13px] text-muted-2">Checking the route</p>
        )}
        {!quoting && quote && (
          <>
            <p className="font-mono text-[13px] text-muted-2">
              Gas:{" "}
              {quote.gasSponsored
                ? "$0.00 (sponsored)"
                : "paid from your balance"}
            </p>
            {quote.totalFeeUsd > 0 && (
              <p className="font-mono text-[13px] text-muted-2">
                Route fee: {formatCurrency(quote.totalFeeUsd)}
              </p>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming}
        className="mt-8 w-full rounded-full border-2 border-void bg-coral px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
      >
        {confirming ? "Sending" : "Confirm & Send"}
      </button>
    </div>
  );
}
