"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ModePill } from "@/components/ModePill";
import { ModeHistory } from "@/components/ModeHistory";
import { IdentityInput } from "@/components/IdentityInput";
import { AmountInput } from "@/components/AmountInput";
import { ErrorNote } from "@/components/ErrorNote";
import { createSplit, getSplitStatus } from "@/lib/split";
import { settleShareOnChain } from "@/lib/settle";
import { readSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";
import type { IdentityResolution } from "@/lib/identity";
import type { MemberStatus } from "@/lib/split";

type Step = "details" | "members" | "method" | "link" | "dashboard";
type SplitMethod = "equal" | "custom";

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
      className="mt-8 w-full rounded-full border-2 border-void bg-mint px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
    >
      {children}
    </button>
  );
}

function MemberAvatar() {
  return (
    <span
      aria-hidden="true"
      className="h-8 w-8 shrink-0 rounded-full border-2 border-void bg-void-3"
    />
  );
}

function DashboardStage({
  splitId,
  shareToken,
  organizerAddress,
}: {
  splitId: string;
  shareToken: string;
  organizerAddress: string;
}) {
  const [statuses, setStatuses] = useState<MemberStatus[] | null>(null);
  const [settlingInput, setSettlingInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSplitStatus(splitId)
      .then((result) => {
        if (!cancelled) setStatuses(result);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        // Without this the dashboard sits on its loading skeleton forever.
        setError(getErrorMessage(caught));
        setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [splitId]);

  async function handleSettle(memberId: string, input: string, amount: number) {
    setSettlingInput(input);
    setError(null);
    try {
      await settleShareOnChain({
        shareToken,
        memberId,
        organizerAddress,
        amount,
      });
      setStatuses((prev) =>
        prev
          ? prev.map((status) =>
              status.input === input ? { ...status, settled: true } : status
            )
          : prev
      );
    } catch (caught) {
      // Leave the member unsettled so the row stays actionable for a retry.
      setError(getErrorMessage(caught));
    } finally {
      setSettlingInput(null);
    }
  }

  if (loadFailed) {
    return (
      <div className="w-full max-w-sm">
        <ErrorNote message={error} />
      </div>
    );
  }

  if (!statuses) {
    return (
      <StepCard>
        <p className="font-body text-sm text-muted">Loading</p>
      </StepCard>
    );
  }

  const totalAmount = statuses.reduce((sum, status) => sum + status.amount, 0);
  const collected = statuses
    .filter((status) => status.settled)
    .reduce((sum, status) => sum + status.amount, 0);

  return (
    <StepCard>
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        Split dashboard
      </p>
      <p className="mt-3 font-display text-2xl font-bold text-text">
        {formatCurrency(collected)}{" "}
        <span className="text-muted">of {formatCurrency(totalAmount)}</span>
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {statuses.map((status) => (
          <div key={status.input} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MemberAvatar />
              <span className="font-body text-sm text-text">{status.input}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-body text-sm text-muted">
                {formatCurrency(status.amount)}
              </span>
              {status.settled ? (
                <span className="flex items-center gap-1.5 font-body text-[12px] text-text">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
                  Settled
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSettle(status.id, status.input, status.amount)}
                  disabled={settlingInput === status.input}
                  className="rounded-full border-2 border-void bg-mint px-3 py-1 font-body text-[12px] font-medium text-void shadow-[2px_2px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
                >
                  {settlingInput === status.input ? "Settling" : "Settle"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ErrorNote message={error} className="mt-6" />

      <Link
        href="/home"
        className="mt-8 block w-full rounded-full border-2 border-void bg-mint px-6 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
      >
        Done
      </Link>
    </StepCard>
  );
}

export default function SplitPage() {
  const [step, setStep] = useState<Step>("details");
  const [splitName, setSplitName] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [members, setMembers] = useState<IdentityResolution[]>([]);
  const [pendingMember, setPendingMember] = useState<IdentityResolution | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [method, setMethod] = useState<SplitMethod>("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [creatingLink, setCreatingLink] = useState(false);
  const [splitLink, setSplitLink] = useState<string | null>(null);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Number(totalValue) || 0;
  const equalShare = members.length > 0 ? total / (members.length + 1) : 0;
  const customSum = members.reduce(
    (sum, member) => sum + (Number(customAmounts[member.input]) || 0),
    0
  );
  const customMatchesTotal = Math.abs(customSum - total) < 0.01;

  const handlePendingChange = useCallback(
    (next: IdentityResolution | null) => setPendingMember(next),
    []
  );

  function handleAddMember() {
    if (!pendingMember) return;
    setMembers((prev) =>
      prev.some((member) => member.input === pendingMember.input)
        ? prev
        : [...prev, pendingMember]
    );
    setPendingMember(null);
    setInputKey((key) => key + 1);
  }

  function handleRemoveMember(input: string) {
    setMembers((prev) => prev.filter((member) => member.input !== input));
    setCustomAmounts((prev) => {
      const next = { ...prev };
      delete next[input];
      return next;
    });
  }

  function handleCustomAmountChange(input: string, raw: string) {
    if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
      setCustomAmounts((prev) => ({ ...prev, [input]: raw }));
    }
  }

  async function handleCreateSplit() {
    setCreatingLink(true);
    setError(null);
    try {
      const created = await createSplit({
        name: splitName || undefined,
        totalAmount: total,
        method: method === "equal" ? "equal" : "custom",
        members: members.map((m) => ({
          ref: m.input,
          shareAmount:
            method === "equal"
              ? total / members.length
              : Number(customAmounts[m.input] ?? 0),
        })),
      });
      setSplitId(created.id);
      setSplitLink(created.shareUrl);
      setStep("link");
    } catch (caught) {
      // Stays on the members step so the roster and amounts survive a retry.
      setError(getErrorMessage(caught));
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleCopy() {
    if (!splitLink) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(splitLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable over plain HTTP and in some in-app browsers.
      // Say so rather than confirming a copy that never happened.
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  }


  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <ModePill />
      </div>

      <ModeHistory mode="split" />

      {splitName && step !== "details" && (
        <p className="w-full max-w-sm px-2 font-body text-sm text-muted">
          {splitName}
        </p>
      )}

      {step === "details" && (
        <StepCard>
          <label htmlFor="split-name" className="sr-only">
            Split name
          </label>
          <input
            id="split-name"
            name="split-name"
            type="text"
            value={splitName}
            onChange={(event) => setSplitName(event.target.value)}
            placeholder="Name this split (optional), e.g. Tokyo dinner"
            className="w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
          />

          <div className="mt-8">
            <AmountInput
              value={totalValue}
              onChange={setTotalValue}
              subtext="Total in USDC"
              showQuickSelect={false}
              showAdvanced={false}
            />
          </div>

          <PrimaryButton disabled={total <= 0} onClick={() => setStep("members")}>
            Next
          </PrimaryButton>
        </StepCard>
      )}

      {step === "members" && (
        <StepCard>
          <IdentityInput key={inputKey} onResolvedChange={handlePendingChange} />

          <button
            type="button"
            onClick={handleAddMember}
            disabled={!pendingMember}
            className="mt-4 w-full rounded-full border-2 border-void bg-surface px-6 py-3 font-body text-sm font-medium text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
          >
            Add member
          </button>

          {members.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              {members.map((member) => (
                <div
                  key={member.input}
                  className="flex items-center gap-3 rounded-lg border-2 border-void bg-void-3 px-4 py-3"
                >
                  <MemberAvatar />
                  <span className="flex-1 font-body text-sm text-text">
                    {member.input}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.input)}
                    aria-label={`Remove ${member.input}`}
                    className="rounded-md p-1 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <PrimaryButton
            disabled={members.length < 2}
            onClick={() => setStep("method")}
          >
            Continue
          </PrimaryButton>
        </StepCard>
      )}

      {step === "method" && (
        <StepCard>
          <div className="inline-flex self-start gap-2">
            <button
              type="button"
              onClick={() => setMethod("equal")}
              className={`rounded-full border-2 border-void px-4 py-2 font-body text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)] ${
                method === "equal"
                  ? "bg-mint text-void shadow-[3px_3px_0_0_var(--color-brut-line)]"
                  : "bg-surface text-muted hover:text-text"
              }`}
            >
              Equal
            </button>
            <button
              type="button"
              onClick={() => setMethod("custom")}
              className={`rounded-full border-2 border-void px-4 py-2 font-body text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)] ${
                method === "custom"
                  ? "bg-mint text-void shadow-[3px_3px_0_0_var(--color-brut-line)]"
                  : "bg-surface text-muted hover:text-text"
              }`}
            >
              Custom
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-body text-sm text-muted">You</span>
              {method === "equal" && (
                <span className="font-body text-sm text-muted">
                  {formatCurrency(equalShare)}
                </span>
              )}
            </div>

            {members.map((member) => (
              <div
                key={member.input}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar />
                  <span className="font-body text-sm text-text">
                    {member.input}
                  </span>
                </div>
                {method === "equal" ? (
                  <span className="font-body text-sm text-text">
                    {formatCurrency(equalShare)}
                  </span>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmounts[member.input] ?? ""}
                    onChange={(event) =>
                      handleCustomAmountChange(member.input, event.target.value)
                    }
                    placeholder="0.00"
                    aria-label={`Amount for ${member.input}`}
                    className="w-24 rounded-md border-2 border-void bg-void-3 px-3 py-2 text-right font-body text-sm text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
                  />
                )}
              </div>
            ))}
          </div>

          {method === "custom" && !customMatchesTotal && (
            <p className="mt-4 font-body text-[12px] text-coral">
              Custom amounts add up to {formatCurrency(customSum)}. Total is{" "}
              {formatCurrency(total)}.
            </p>
          )}

          <ErrorNote message={error} className="mt-4" />

          <PrimaryButton disabled={creatingLink} onClick={handleCreateSplit}>
            {creatingLink ? "Creating" : "Continue"}
          </PrimaryButton>
        </StepCard>
      )}

      {step === "link" && (
        <StepCard>
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            Split link
          </p>

          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="split-link" className="sr-only">
              Split link
            </label>
            <input
              id="split-link"
              readOnly
              value={splitLink ?? ""}
              className="flex-1 rounded-md border-2 border-void bg-void-3 px-4 py-3 font-mono text-[13px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border-2 border-void bg-surface px-4 py-3 font-body text-sm text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <ErrorNote message={error} className="mt-4" />

          <PrimaryButton onClick={() => setStep("dashboard")}>
            View split dashboard
          </PrimaryButton>
        </StepCard>
      )}

      {step === "dashboard" && <DashboardStage
          splitId={splitId ?? ""}
          shareToken={splitLink?.split("/").pop() ?? ""}
          organizerAddress={readSession()?.address ?? ""}
        />}
    </div>
  );
}
