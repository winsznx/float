"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { linkFetch } from "@/lib/api";
import { settleShareOnChain } from "@/lib/settle";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";

/**
 * Split settle link — opened by someone who may have no FLOAT account at all,
 * from a link the organizer shared. Authorization is the token in the URL, so
 * there is no session here by design.
 */

type SplitView = {
  id: string;
  name: string | null;
  total_amount: number;
  token: string;
  status: string;
  organizerAddress: string | null;
  organizerHandle: string | null;
  split_members: Array<{
    id: string;
    member_ref: string;
    share_amount: number;
    settled: boolean;
  }>;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function SettlePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [split, setSplit] = useState<SplitView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    linkFetch<SplitView>(`/settle/${token}`)
      .then((data) => {
        if (!cancelled) setSplit(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function settle(memberId: string, amount: number) {
    if (!split?.organizerAddress) {
      setError("The organizer has no payout address yet.");
      return;
    }
    setSettling(memberId);
    setError(null);
    try {
      // Magic signs the member in on the spot if they have no account — this
      // is the whole point of the link: no wallet install, no app.
      await settleShareOnChain({
        shareToken: token,
        memberId,
        organizerAddress: split.organizerAddress,
        amount,
        email: email || undefined,
      });
      const refreshed = await linkFetch<SplitView>(`/settle/${token}`);
      setSplit(refreshed);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSettling(null);
    }
  }

  if (error && !split) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">Link expired</p>
          <p className="mt-3 font-body text-[14px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  if (!split) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono text-sm text-muted">Loading</p>
      </main>
    );
  }

  const outstanding = split.split_members.filter((m) => !m.settled);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted">Split</p>
        <h1 className="mt-2 font-display text-[26px] font-bold text-text">
          {split.name ?? "Settle up"}
        </h1>
        <p className="mt-2 font-body text-[14px] text-muted">
          {formatCurrency(split.total_amount)} total · settle from whatever you hold.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-6 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <div className="flex flex-col gap-4">
          {split.split_members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3">
              <span className="font-body text-sm text-text">{member.member_ref}</span>
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-muted">
                  {formatCurrency(member.share_amount)}
                </span>
                {member.settled ? (
                  <span className="flex items-center gap-1.5 font-body text-[12px] text-text">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
                    Settled
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => settle(member.id, member.share_amount)}
                    disabled={settling === member.id}
                    className="rounded-full border-2 border-void bg-mint px-3 py-1 font-body text-[12px] font-medium text-void shadow-[2px_2px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                  >
                    {settling === member.id ? "Settling" : "Settle"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {outstanding.length > 0 && (
          <div className="mt-6 border-t-2 border-border-strong pt-5">
            <label htmlFor="settle-email" className="font-mono text-xs uppercase tracking-wide text-muted">
              Your email
            </label>
            <input
              id="settle-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            />
            <p className="mt-2 font-body text-[12px] text-muted">
              We&apos;ll create your wallet automatically. No app, no seed phrase.
            </p>
          </div>
        )}

        <ErrorNote message={error} className="mt-5" />

        {outstanding.length === 0 && (
          <p className="mt-6 text-center font-body text-[14px] text-text">
            Everyone&apos;s settled. Nothing left to pay.
          </p>
        )}
      </div>

      <Link
        href="/"
        className="text-center font-mono text-[11px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        FLOAT · no wallet or app install needed
      </Link>
    </main>
  );
}
