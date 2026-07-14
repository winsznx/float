"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ModePill } from "@/components/ModePill";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { ConfirmationCard } from "@/components/ConfirmationCard";
import { sendPayment } from "@/lib/send";
import type { IdentityResolution } from "@/lib/identity";
import type { SendReceipt } from "@/lib/send";

const SOURCE_CHAIN = "Base";
const MAX_AMOUNT = 1247.83;
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
    <div className="w-full max-w-sm rounded-2xl border border-float-border bg-float-surface p-8">
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
      className="mt-8 w-full rounded-full bg-float-signal px-6 py-4 font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
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
              className="absolute h-1.5 w-1.5 rounded-full bg-float-signal"
              style={{ left: "50%", top: "50%", marginLeft: "-3px", marginTop: "-3px" }}
            />
          ))}
          <span
            ref={amountRef}
            className="font-display text-2xl font-bold text-float-heading"
          >
            {formatCurrency(amount)}
          </span>
        </div>
        <p className="mt-6 font-body text-sm text-float-muted">Sending</p>
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
      { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
    );
  }, []);

  return (
    <StepCard>
      <div ref={settleRef} className="flex flex-col items-center opacity-0">
        <span
          aria-hidden="true"
          className="h-12 w-12 rounded-full border border-float-border bg-float-surface-2"
        />
        <p className="mt-4 font-display text-2xl font-bold text-float-heading">
          {formatCurrency(amount)}
        </p>
        <p className="mt-1 font-body text-sm text-float-muted">
          to {recipientLabel}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-1 border-t border-float-border pt-6">
        <p className="font-body text-[13px] text-float-body">
          <span className="text-float-muted">Amount</span>{" "}
          {formatCurrency(amount)}
        </p>
        <p className="font-body text-[13px] text-float-body">
          <span className="text-float-muted">To</span> {recipientLabel}
        </p>
        <p className="font-body text-[13px] text-float-body">
          <span className="text-float-muted">Time</span>{" "}
          {formatTimestamp(receipt.timestamp)}
        </p>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3">
        {/* TODO: wire share functionality (native share sheet / copy receipt link). */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full rounded-full border border-float-border bg-float-surface px-6 py-4 font-body text-[15px] font-medium text-float-body transition-colors hover:bg-float-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
        >
          Share
        </button>
        <Link
          href="/home"
          className="w-full rounded-full bg-float-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
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

  const amount = Number(amountValue) || 0;
  const recipientLabel = resolution?.input ?? "";
  const destinationChain = resolution?.preferredChain || SOURCE_CHAIN;

  const handleResolvedChange = useCallback(
    (next: IdentityResolution | null) => setResolution(next),
    []
  );

  async function handleConfirm() {
    if (!resolution) return;
    setStep("sending");
    const result = await sendPayment({ recipient: resolution, amount, note });
    setReceipt(result);
    setStep("success");
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
            maxAmount={MAX_AMOUNT}
          />
          <PrimaryButton disabled={amount <= 0} onClick={() => setStep("note")}>
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
            className="w-full resize-none rounded-md border border-float-border bg-float-surface-2 px-4 py-3 font-body text-[15px] text-float-body placeholder:text-float-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
          />
          {note.length >= NOTE_LIMIT - 20 && (
            <p className="mt-2 text-right font-body text-[12px] text-float-muted">
              {note.length}/{NOTE_LIMIT}
            </p>
          )}
          <PrimaryButton onClick={() => setStep("confirm")}>
            Continue
          </PrimaryButton>
        </StepCard>
      )}

      {step === "confirm" && resolution && (
        <ConfirmationCard
          amount={amount}
          recipientLabel={recipientLabel}
          sourceChain={SOURCE_CHAIN}
          destinationChain={destinationChain}
          onConfirm={handleConfirm}
          confirming={false}
        />
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
