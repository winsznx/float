"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ModePill } from "@/components/ModePill";
import { ModeHistory } from "@/components/ModeHistory";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { ConfirmationCard } from "@/components/ConfirmationCard";
import { ErrorNote } from "@/components/ErrorNote";
import { sendPayment, quoteSend } from "@/lib/send";
import { downloadReceiptImage } from "@/lib/receipt-image";
import { getErrorMessage } from "@/lib/errors";
import { MoneyMovedError } from "@/lib/money-moved";
import { getBalance, type UnifiedBalance } from "@/lib/balance";
import { destinationChainFor } from "@/lib/chain/universal-account";
import type { IdentityResolution } from "@/lib/identity";
import type { SendReceipt, SendQuote } from "@/lib/send";

const NOTE_LIMIT = 140;

type Step =
  | "recipient"
  | "amount"
  | "note"
  | "confirm"
  | "sending"
  | "success"
  | "unrecorded";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-8 w-full rounded-full border-2 border-void bg-coral px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
    >
      {children}
    </button>
  );
}

const PARTICLE_COUNT = 6;

function SendingStage({ amount }: { amount: number }) {
  const amountRef = useRef<HTMLSpanElement>(null);
  const particleRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const amountEl = amountRef.current;
    if (!amountEl) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const particles = particleRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null
    );

    const tl = gsap.timeline();
    tl.to(amountEl, { y: -4, duration: 0.15, ease: "power2.out" }).to(
      amountEl,
      { y: -60, opacity: 0, duration: 0.5, ease: "power2.in" },
      "+=0.05"
    );

    particles.forEach((particle, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const radius = 26;
      tl.to(
        particle,
        {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          opacity: 0,
          duration: 0.5,
          ease: "power1.out",
        },
        "<"
      );
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <StepCard>
      <div className="flex flex-col items-center py-8">
        <div className="relative flex h-16 w-full items-center justify-center">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                particleRefs.current[i] = el;
              }}
              aria-hidden="true"
              className="absolute h-1.5 w-1.5 rounded-full bg-coral"
              style={{ left: "50%", top: "50%", marginLeft: "-3px", marginTop: "-3px" }}
            />
          ))}
          <span
            ref={amountRef}
            className="font-display text-2xl font-bold text-text"
          >
            {formatCurrency(amount)}
          </span>
        </div>
        <p className="mt-6 font-mono text-sm text-muted">Sending</p>
      </div>
    </StepCard>
  );
}

function SuccessStage({
  amount,
  recipientLabel,
  receipt,
}: {
  amount: number;
  recipientLabel: string;
  receipt: SendReceipt;
}) {
  const settleRef = useRef<HTMLDivElement>(null);
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function saveImage() {
    setSaving(true);
    setImageError(null);
    try {
      await downloadReceiptImage({
        amount,
        recipientLabel,
        senderHandle: null,
        timestamp: receipt.timestamp,
        status: receipt.status,
        txId: receipt.txId,
      });
    } catch (caught) {
      setImageError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  /**
   * The Share button did nothing at all — onClick was an empty function.
   *
   * The link is FLOAT's own receipt, not Particle's explorer: that page shows
   * a bundler's view of a userOp rather than "you paid this person this much",
   * and it exposed the sender's whole activity history to anyone with the URL.
   */
  async function shareReceipt() {
    const text = `Sent ${formatCurrency(amount)} to ${recipientLabel} on FLOAT`;
    const url = `${window.location.origin}/r/${receipt.shareToken}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} — ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // User dismissed the share sheet, or the clipboard is unavailable.
    }
  }

  useEffect(() => {
    const el = settleRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(el, { opacity: 1, scale: 1 });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.4, ease: "power4.out" }
    );
  }, []);

  return (
    <StepCard>
      <div ref={settleRef} className="flex flex-col items-center opacity-0">
        <span
          aria-hidden="true"
          className="h-14 w-14 rounded-full border-2 border-void bg-void-3"
        />
        <p className="mt-4 font-display text-3xl font-bold text-text">
          {formatCurrency(amount)}
        </p>
        <p className="mt-1 font-body text-sm text-muted">
          to {recipientLabel}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t-2 border-border-strong pt-6">
        <p className="flex justify-between font-body text-[13px] text-text">
          <span className="text-muted">Amount</span>
          <span className="font-mono">{formatCurrency(amount)}</span>
        </p>
        <p className="flex justify-between font-body text-[13px] text-text">
          <span className="text-muted">To</span>
          <span className="font-mono">{recipientLabel}</span>
        </p>
        <p className="flex justify-between font-body text-[13px] text-text">
          <span className="text-muted">Time</span>
          <span className="font-mono">{formatTimestamp(receipt.timestamp)}</span>
        </p>
        {receipt.txId && (
          <a
            href={`https://universalx.app/activity/details?id=${receipt.txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between font-body text-[13px] text-signal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <span className="text-muted">Transaction</span>
            <span className="font-mono">{`${receipt.txId.slice(0, 10)}…`}</span>
          </a>
        )}
      </div>

      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={shareReceipt}
          className="w-full rounded-full border-2 border-void bg-surface px-6 py-4 font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        >
          {shared ? "Copied" : "Share receipt"}
        </button>
        <button
          type="button"
          onClick={saveImage}
          disabled={saving}
          className="w-full rounded-full border-2 border-void bg-surface px-6 py-4 font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        >
          {saving ? "Saving" : "Save as image"}
        </button>
        <ErrorNote message={imageError} />
        <Link
          href="/home"
          className="w-full rounded-full border-2 border-void bg-coral px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        >
          Done
        </Link>
      </div>
    </StepCard>
  );
}

export default function SendPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [resolution, setResolution] = useState<IdentityResolution | null>(null);
  const [amountValue, setAmountValue] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<SendReceipt | null>(null);
  const [sentTxId, setSentTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [quote, setQuote] = useState<SendQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  // MAX and the source chain come from the user's real holdings. These were
  // hardcoded to $1,247.83 and "Base", so MAX offered money that wasn't there
  // and the confirmation card named a chain the user may not hold anything on.
  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((result) => {
        if (!cancelled) setBalance(result);
      })
      .catch(() => {
        // Leave MAX unavailable rather than inventing a ceiling.
        if (!cancelled) setBalance({ total: 0, chains: [], tokens: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const amount = Number(amountValue) || 0;
  const recipientLabel = resolution?.input ?? "";
  // Prefer the route the quote actually uses; the largest-balance chain is
  // only a guess, and naming a chain the route never touches is the same
  // class of bug as the destination label that used to drift.
  const sourceChain =
    quote?.sourceChain ?? balance?.chains[0]?.chain ?? "your balance";
  // The chain the transfer is actually built for, not the recipient's raw
  // preference: FLOAT can only deliver USDC to chains it has a contract for,
  // and naming one it falls back from is how the card came to promise Base on
  // a transfer that settled on Arbitrum.
  // Prefer the quote's chain: fallback can move the destination off the
  // recipient's preference, and the card must name where the money truly lands.
  const destinationChain =
    quote?.destinationChain ?? destinationChainFor(resolution?.preferredChain).label;

  const handleResolvedChange = useCallback(
    (next: IdentityResolution | null) => setResolution(next),
    []
  );

  /**
   * Reaching the confirmation screen is a click, so the quote is fetched here
   * rather than in an effect keyed on the step.
   *
   * A quote that fails leaves the card with no cost line at all. That is the
   * point: the previous behaviour was to state a sponsorship and an ETA
   * unconditionally, and showing nothing is better than showing a guess.
   */
  async function handleReviewSend() {
    setStep("confirm");
    setError(null);
    setQuote(null);

    if (!resolution?.resolvedAddress) return;

    setQuoting(true);
    try {
      setQuote(await quoteSend({ recipient: resolution, amount }));
    } catch {
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }

  async function handleConfirm() {
    if (!resolution) return;
    setStep("sending");
    setError(null);
    try {
      const result = await sendPayment({ recipient: resolution, amount, note });
      setReceipt(result);
      setStep("success");
    } catch (caught) {
      setError(getErrorMessage(caught));
      // Only a failure that moved no money returns to confirm. Re-arming the
      // button after the transfer landed is what turned a dropped connection
      // into a second, real payment.
      if (caught instanceof MoneyMovedError) {
        setSentTxId(caught.txHash);
        setStep("unrecorded");
        return;
      }
      // Keeps the entered amount, note, and recipient so a declined signature
      // or failed route can be retried without re-entry.
      setStep("confirm");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

      <ModeHistory mode="send" />

      {step === "recipient" && (
        <StepCard>
          <IdentityInput onResolvedChange={handleResolvedChange} />
          <PrimaryButton
            disabled={!resolution}
            onClick={() => setStep("amount")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "amount" && (
        <StepCard>
          <AmountInput
            value={amountValue}
            onChange={setAmountValue}
            maxAmount={balance?.total ?? 0}
          />
          {balance && amount > balance.total && (
            <p className="mt-3 text-center font-body text-[13px] text-coral">
              That&apos;s more than your balance of ${balance.total.toFixed(2)}.
            </p>
          )}
          <PrimaryButton
            disabled={amount <= 0 || (!!balance && amount > balance.total)}
            onClick={() => setStep("note")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "note" && (
        <StepCard>
          <label htmlFor="note" className="sr-only">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            value={note}
            maxLength={NOTE_LIMIT}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note (optional)"
            rows={3}
            className="w-full resize-none rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
          />
          {note.length >= NOTE_LIMIT - 20 && (
            <p className="mt-2 text-right font-mono text-[12px] text-muted-2">
              {note.length}/{NOTE_LIMIT}
            </p>
          )}
          <PrimaryButton onClick={handleReviewSend}>Continue</PrimaryButton>
        </StepCard>
      )}

      {step === "confirm" && resolution && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <ErrorNote message={error} className="w-full" />
          <ConfirmationCard
            amount={amount}
            recipientLabel={recipientLabel}
            recipientAddress={resolution.resolvedAddress}
            sourceChain={sourceChain}
            destinationChain={destinationChain}
            quote={quote}
            quoting={quoting}
            onConfirm={handleConfirm}
            confirming={false}
          />
        </div>
      )}

      {step === "sending" && <SendingStage amount={amount} />}

      {step === "success" && receipt && (
        <SuccessStage
          amount={amount}
          recipientLabel={recipientLabel}
          receipt={receipt}
        />
      )}

      {/* Terminal on purpose. The money is gone from the sender's balance, so
          the one thing this screen must never offer is another send. */}
      {step === "unrecorded" && (
        <StepCard>
          <p className="font-display text-[20px] font-bold text-text">
            Sent — but not saved
          </p>
          <p className="mt-3 font-body text-[14px] text-muted">
            {formatCurrency(amount)} reached {recipientLabel}. We couldn&apos;t
            write it to your history, so it won&apos;t appear there. Nothing was
            lost.
          </p>
          {sentTxId && (
            <p className="mt-4 font-mono text-[12px] text-muted-2 break-all">
              {sentTxId}
            </p>
          )}
          <Link
            href="/home"
            className="mt-8 block w-full rounded-full border-2 border-void bg-coral px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
          >
            Done
          </Link>
        </StepCard>
      )}
    </div>
  );
}
