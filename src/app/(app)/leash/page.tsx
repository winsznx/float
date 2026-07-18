"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ModePill } from "@/components/ModePill";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { LeashCard } from "@/components/LeashCard";
import { createLeash, getLeashUsage, revokeLeash } from "@/lib/leash";
import type { IdentityResolution } from "@/lib/identity";
import type { ContractScope, Leash } from "@/lib/leash";

type Step = "beneficiary" | "limit" | "scope" | "expiry" | "review" | "active";
type RevokeState = "idle" | "confirming" | "revoked";

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
      className="mt-8 w-full rounded-full border-2 border-void bg-lav px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
    >
      {children}
    </button>
  );
}

export default function LeashPage() {
  const [step, setStep] = useState<Step>("beneficiary");
  const [resolution, setResolution] = useState<IdentityResolution | null>(null);
  const [spendLimitValue, setSpendLimitValue] = useState("");
  const [contractScope, setContractScope] = useState<ContractScope>("basic");
  const [contractAddress, setContractAddress] = useState("");
  const [expiry, setExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [leash, setLeash] = useState<Leash | null>(null);
  const [used, setUsed] = useState(0);
  const [revokeState, setRevokeState] = useState<RevokeState>("idle");

  const spendLimit = Number(spendLimitValue) || 0;

  const handleResolvedChange = useCallback(
    (next: IdentityResolution | null) => setResolution(next),
    []
  );

  async function handleConfirmCreate() {
    if (!resolution) return;
    setCreating(true);
    const result = await createLeash({
      beneficiary: resolution,
      spendLimit,
      contractScope,
      contractAddress: contractScope === "advanced" && contractAddress ? contractAddress : null,
      expiry,
    });
    const usage = await getLeashUsage(result.leashId, result.spendLimit);
    setLeash(result);
    setUsed(usage);
    setCreating(false);
    setStep("active");
  }

  async function handleRevokeConfirm() {
    if (!leash) return;
    await revokeLeash(leash.leashId);
    setRevokeState("revoked");
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

      {step === "beneficiary" && (
        <StepCard>
          <IdentityInput onResolvedChange={handleResolvedChange} />
          <PrimaryButton
            disabled={!resolution}
            onClick={() => setStep("limit")}
          >
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "limit" && (
        <StepCard>
          <AmountInput
            value={spendLimitValue}
            onChange={setSpendLimitValue}
            subtext="USDC spend limit"
            showAdvanced={false}
          />
          <PrimaryButton disabled={spendLimit <= 0} onClick={() => setStep("scope")}>
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "scope" && (
        <StepCard>
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            Contract scope
          </p>

          <div className="mt-3 inline-flex self-start gap-2">
            <button
              type="button"
              onClick={() => setContractScope("basic")}
              className={`rounded-full border-2 border-void px-4 py-2 font-body text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)] ${
                contractScope === "basic"
                  ? "bg-lav text-void shadow-[3px_3px_0_0_var(--color-brut-line)]"
                  : "bg-surface text-muted hover:text-text"
              }`}
            >
              Basic
            </button>
            <button
              type="button"
              onClick={() => setContractScope("advanced")}
              className={`rounded-full border-2 border-void px-4 py-2 font-body text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)] ${
                contractScope === "advanced"
                  ? "bg-lav text-void shadow-[3px_3px_0_0_var(--color-brut-line)]"
                  : "bg-surface text-muted hover:text-text"
              }`}
            >
              Advanced
            </button>
          </div>

          <div className="mt-6">
            {contractScope === "basic" ? (
              <p className="font-body text-sm text-muted">
                Any contract, within your limit.
              </p>
            ) : (
              <div>
                <label htmlFor="contract-address" className="sr-only">
                  Contract address
                </label>
                {/* TODO: wire real contract allowlist logic once LeashManager scoping is defined (see PRD Leash Contract). UI scaffolding only for now. */}
                <input
                  id="contract-address"
                  name="contract-address"
                  type="text"
                  autoComplete="off"
                  value={contractAddress}
                  onChange={(event) => setContractAddress(event.target.value)}
                  placeholder="Contract address (optional)"
                  className="w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-mono text-[13px] text-text placeholder:font-body placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
                />
              </div>
            )}
          </div>

          <PrimaryButton onClick={() => setStep("expiry")}>Next</PrimaryButton>
        </StepCard>
      )}

      {step === "expiry" && (
        <StepCard>
          <label htmlFor="expiry" className="font-mono text-xs uppercase tracking-wide text-muted">
            Expires
          </label>
          <input
            id="expiry"
            name="expiry"
            type="date"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
            className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
          />
          <PrimaryButton disabled={!expiry} onClick={() => setStep("review")}>
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "review" && resolution && (
        <div className="flex w-full max-w-sm flex-col gap-6">
          <LeashCard
            variant="review"
            beneficiaryLabel={resolution.input}
            spendLimit={spendLimit}
            used={0}
            expiry={expiry}
          />
          <button
            type="button"
            onClick={handleConfirmCreate}
            disabled={creating}
            className="w-full rounded-full border-2 border-void bg-lav px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
          >
            {creating ? "Creating" : "Confirm & Create"}
          </button>
        </div>
      )}

      {step === "active" && leash && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          {revokeState !== "revoked" && (
            <LeashCard
              variant="active"
              beneficiaryLabel={leash.beneficiary}
              spendLimit={leash.spendLimit}
              used={used}
              expiry={leash.expiry}
              onRevoke={
                revokeState === "idle" ? () => setRevokeState("confirming") : undefined
              }
            />
          )}

          {revokeState === "confirming" && (
            <StepCard>
              <p className="font-body text-[15px] text-text">
                Revoking removes {leash.beneficiary}&apos;s access immediately.
              </p>
              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setRevokeState("idle")}
                  className="font-body text-sm font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  className="font-body text-sm font-medium text-coral transition-colors hover:text-coral/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
                >
                  Confirm revoke
                </button>
              </div>
            </StepCard>
          )}

          {revokeState === "revoked" && (
            <StepCard>
              <p className="font-body text-[15px] text-text">
                Access removed. Unused balance returned to your account.
              </p>
              <Link
                href="/home"
                className="mt-8 block w-full rounded-full border-2 border-void bg-lav px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lav)]"
              >
                Done
              </Link>
            </StepCard>
          )}
        </div>
      )}
    </div>
  );
}
