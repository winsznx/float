"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Lock } from "lucide-react";
import { ModePill } from "@/components/ModePill";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { PledgeCard } from "@/components/PledgeCard";
import { createPledge, FAILURE_DESTINATIONS } from "@/lib/pledge";
import type { IdentityResolution } from "@/lib/identity";
import type { Pledge } from "@/lib/pledge";

type Step =
  | "goal"
  | "stake"
  | "witness"
  | "destination"
  | "deadline"
  | "public"
  | "review"
  | "locking"
  | "locked";

const GOAL_LIMIT = 200;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
      className="mt-8 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
    >
      {children}
    </button>
  );
}

function LockingStage({ stake }: { stake: number }) {
  const amountRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const amountEl = amountRef.current;
    const lockEl = lockRef.current;
    if (!amountEl || !lockEl) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(amountEl, { scale: 1, opacity: 1 });
      gsap.set(lockEl, { opacity: 1, scale: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.to(amountEl, { scale: 0.98, duration: 0.15, ease: "power2.out" })
      .fromTo(
        lockEl,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" },
        "<+0.05"
      )
      .to(amountEl, { scale: 1, duration: 0.15, ease: "power2.out" })
      .to(amountEl, {
        opacity: 0.55,
        duration: 0.15,
        ease: "power1.inOut",
        yoyo: true,
        repeat: 1,
      });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <StepCard>
      <div className="flex flex-col items-center py-8">
        <div
          ref={amountRef}
          className="relative flex items-center justify-center"
        >
          <span className="font-display text-2xl font-bold text-signal">
            {formatCurrency(stake)}
          </span>
          <span
            ref={lockRef}
            aria-hidden="true"
            className="absolute -right-7 flex h-6 w-6 items-center justify-center rounded-full border-2 border-void bg-void-3 opacity-0"
          >
            <Lock size={14} className="text-signal" />
          </span>
        </div>
        <p className="mt-6 font-mono text-sm text-muted">Locking</p>
      </div>
    </StepCard>
  );
}

export default function PledgePage() {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState("");
  const [stakeValue, setStakeValue] = useState("");
  const [witnessResolution, setWitnessResolution] =
    useState<IdentityResolution | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(
    null
  );
  const [showCustomDestination, setShowCustomDestination] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pledge, setPledge] = useState<Pledge | null>(null);

  const stake = Number(stakeValue) || 0;

  const failureLabel = showCustomDestination
    ? customAddress.trim()
    : FAILURE_DESTINATIONS.find((dest) => dest.id === selectedDestination)?.label ??
      "";

  const handleWitnessChange = useCallback(
    (next: IdentityResolution | null) => setWitnessResolution(next),
    []
  );

  function handleSelectDestination(id: string) {
    setSelectedDestination(id);
    setShowCustomDestination(false);
    setCustomAddress("");
  }

  function handleSelectCustomDestination() {
    setSelectedDestination(null);
    setShowCustomDestination(true);
  }

  async function handleConfirmLock() {
    if (!witnessResolution) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setCreating(true);
    } else {
      setStep("locking");
    }

    const result = await createPledge({
      goal,
      stake,
      witness: witnessResolution,
      failureDestinationLabel: failureLabel,
      deadline,
      isPublic,
    });

    setPledge(result);
    setCreating(false);
    setStep("locked");
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

      {step === "goal" && (
        <StepCard>
          <label htmlFor="goal" className="sr-only">
            Goal
          </label>
          <textarea
            id="goal"
            name="goal"
            value={goal}
            maxLength={GOAL_LIMIT}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Ship FLOAT v1 by June 30"
            rows={3}
            className="w-full resize-none rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          />
          {goal.length >= GOAL_LIMIT - 30 && (
            <p className="mt-2 text-right font-mono text-[12px] text-muted-2">
              {goal.length}/{GOAL_LIMIT}
            </p>
          )}
          <PrimaryButton
            disabled={goal.trim().length === 0}
            onClick={() => setStep("stake")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "stake" && (
        <StepCard>
          <AmountInput
            value={stakeValue}
            onChange={setStakeValue}
            subtext="USDC at stake"
            showAdvanced={false}
          />
          <PrimaryButton disabled={stake <= 0} onClick={() => setStep("witness")}>
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "witness" && (
        <StepCard>
          <IdentityInput onResolvedChange={handleWitnessChange} />
          <PrimaryButton
            disabled={!witnessResolution}
            onClick={() => setStep("destination")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "destination" && (
        <StepCard>
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            Something that makes you uncomfortable
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {FAILURE_DESTINATIONS.map((dest) => {
              const active = !showCustomDestination && selectedDestination === dest.id;
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => handleSelectDestination(dest.id)}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)] ${
                    active
                      ? "border-void bg-signal-faint"
                      : "border-void bg-surface hover:bg-void-3"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 rounded-full border-2 border-void ${
                      active ? "bg-signal" : "bg-surface"
                    }`}
                  />
                  <span className="font-body text-sm text-text">
                    {dest.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleSelectCustomDestination}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)] ${
                showCustomDestination
                  ? "border-void bg-signal-faint"
                  : "border-void bg-surface hover:bg-void-3"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border-2 border-void ${
                  showCustomDestination ? "bg-signal" : "bg-surface"
                }`}
              />
              <span className="font-body text-sm text-text">
                Add custom address
              </span>
            </button>

            {showCustomDestination && (
              <div className="mt-1">
                <label htmlFor="custom-address" className="sr-only">
                  Failure destination address
                </label>
                {/* TODO: wire real address validation once failure-destination targeting is defined (see PRD Pledge Contract). UI scaffolding only for now. */}
                <input
                  id="custom-address"
                  name="custom-address"
                  type="text"
                  autoComplete="off"
                  value={customAddress}
                  onChange={(event) => setCustomAddress(event.target.value)}
                  placeholder="Failure destination address"
                  className="w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-mono text-[13px] text-text placeholder:font-body placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
                />
              </div>
            )}
          </div>

          <PrimaryButton
            disabled={!selectedDestination && !(showCustomDestination && customAddress.trim())}
            onClick={() => setStep("deadline")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "deadline" && (
        <StepCard>
          <label htmlFor="deadline" className="font-mono text-xs uppercase tracking-wide text-muted">
            Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          />
          <PrimaryButton disabled={!deadline} onClick={() => setStep("public")}>
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "public" && (
        <StepCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-[15px] font-medium text-text">
                Make public
              </p>
              <p className="mt-1 font-body text-sm text-muted">
                Anyone can see this pledge.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="Make public"
              onClick={() => setIsPublic((prev) => !prev)}
              className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-void transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)] ${
                isPublic ? "bg-signal" : "bg-void-3"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-void bg-surface transition-[left] duration-200 ease-out ${
                  isPublic ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <PrimaryButton onClick={() => setStep("review")}>Next</PrimaryButton>
        </StepCard>
      )}

      {step === "review" && witnessResolution && (
        <div className="flex w-full max-w-sm flex-col gap-6">
          <PledgeCard
            goal={goal}
            stake={stake}
            witnessLabel={witnessResolution.input}
            failureLabel={failureLabel}
            deadline={deadline}
            status="review"
          />
          <button
            type="button"
            onClick={handleConfirmLock}
            disabled={creating}
            className="w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          >
            {creating ? "Locking" : "Confirm & Lock"}
          </button>
        </div>
      )}

      {step === "locking" && <LockingStage stake={stake} />}

      {step === "locked" && pledge && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <PledgeCard
            goal={pledge.goal}
            stake={pledge.stake}
            witnessLabel={pledge.witness}
            failureLabel={pledge.failureDestinationLabel}
            deadline={pledge.deadline}
            status="locked"
            // TODO: wire real public share card generation once that surface exists (see PRD Pledge public share card).
            shareLink={`float.app/pledge/${pledge.pledgeId}`}
          />
          <Link
            href="/home"
            className="w-full rounded-full border-2 border-void bg-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          >
            Done
          </Link>
        </div>
      )}
    </div>
  );
}
