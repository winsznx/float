"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ModePill } from "@/components/ModePill";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { ConfirmationCard } from "@/components/ConfirmationCard";
import { ErrorNote } from "@/components/ErrorNote";
import { sendPayment } from "@/lib/send";
import { getErrorMessage } from "@/lib/errors";
import { getBalance, type UnifiedBalance } from "@/lib/balance";
import type { IdentityResolution } from "@/lib/identity";
import type { SendReceipt } from "@/lib/send";

const NOTE_LIMIT = 140;

type Step = "recipient" | "amount" | "note" | "confirm" | "sending" | "success";

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
      </div>

      <div className="mt-8 flex w-full flex-col gap-3">
        {/* TODO: wire share functionality (native share sheet / copy receipt link). */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full rounded-full border-2 border-void bg-surface px-6 py-4 font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        >
          Share
        </button>
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
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);

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
  const sourceChain = balance?.chains[0]?.chain ?? "your balance";
  const destinationChain = resolution?.preferredChain || sourceChain;

  const handleResolvedChange = useCallback(
    (next: IdentityResolution | null) => setResolution(next),
    []
  );

  async function handleConfirm() {
    if (!resolution) return;
    setStep("sending");
    setError(null);
    try {
      const result = await sendPayment({ recipient: resolution, amount, note });
      setReceipt(result);
      setStep("success");
    } catch (caught) {
      // Returning to confirm keeps the entered amount, note, and recipient so
      // a declined signature or failed route can be retried without re-entry.
      setError(getErrorMessage(caught));
      setStep("confirm");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

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
          <PrimaryButton onClick={() => setStep("confirm")}>
            Continue
          </PrimaryButton>
        </StepCard>
      )}

      {step === "confirm" && resolution && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <ErrorNote message={error} className="w-full" />
          <ConfirmationCard
            amount={amount}
            recipientLabel={recipientLabel}
            sourceChain={sourceChain}
            destinationChain={destinationChain}
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
    </div>
  );
}
