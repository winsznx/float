"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModePill } from "@/components/ModePill";
import { ModeHistory } from "@/components/ModeHistory";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { LeashCard } from "@/components/LeashCard";
import { ErrorNote } from "@/components/ErrorNote";
import { createLeash, revokeLeash, getLeashUsage } from "@/lib/leash";
import { getErrorMessage } from "@/lib/errors";
import type { IdentityResolution } from "@/lib/identity";
import type { Leash } from "@/lib/leash";
import { createRealtimeClient } from "@/lib/realtime";

type Step = "beneficiary" | "limit" | "expiry" | "review" | "active";
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
  const [expiry, setExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [leash, setLeash] = useState<Leash | null>(null);
  const [used, setUsed] = useState(0);
  const [revokeState, setRevokeState] = useState<RevokeState>("idle");
  const [error, setError] = useState<string | null>(null);

  const spendLimit = Number(spendLimitValue) || 0;

  /**
   * Live usage while a leash is active. The indexer mirrors LeashSpent events
   * into leash_spends and leashes.spent; realtime delivers them here, with a
   * poll as the fallback for a blocked socket. Both paths re-read the row —
   * the event payload is a trigger, never the source of truth.
   */
  useEffect(() => {
    if (step !== "active" || !leash) return;

    let cancelled = false;
    const refresh = () => {
      getLeashUsage(leash.id)
        .then((spent) => {
          if (!cancelled) setUsed(spent);
        })
        .catch(() => {
          // The bar keeps its last value; the next event or poll retries.
        });
    };

    const client = createRealtimeClient();
    const channel = client
      ?.channel(`leash-usage-${leash.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leash_spends", filter: `leash_id=eq.${leash.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leashes", filter: `id=eq.${leash.id}` },
        refresh
      )
      .subscribe();

    const poll = setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) void client?.removeChannel(channel);
    };
  }, [step, leash]);

  const handleResolvedChange = useCallback(
    (next: IdentityResolution | null) => setResolution(next),
    []
  );

  async function handleConfirmCreate() {
    if (!resolution) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createLeash({
        beneficiary: resolution,
        spendLimit,
        expiry,
      });
      setLeash(result);
      setUsed(result.spent);
      setStep("active");
    } catch (caught) {
      // Stays on review so the configured limit, scope, and expiry survive a retry.
      setError(getErrorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!leash) return;
    setError(null);
    try {
      await revokeLeash(leash.id, leash.leashId);
      setRevokeState("revoked");
    } catch (caught) {
      // Revoke is the safety valve; surface the failure and leave the dialog
      // open so the creator can retry rather than assume access was removed.
      setError(getErrorMessage(caught));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

      <ModeHistory mode="leash" />

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
          />
          <PrimaryButton disabled={spendLimit <= 0} onClick={() => setStep("expiry")}>
            Next
          </PrimaryButton>
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
          <ErrorNote message={error} />
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
          <ErrorNote message={error} />

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
