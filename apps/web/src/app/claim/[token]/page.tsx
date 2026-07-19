"use client";

import { useEffect, useState, use } from "react";
import { linkFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ErrorNote } from "@/components/ErrorNote";

/**
 * Claim link — someone was sent money before they had a FLOAT account.
 *
 * This is the zero-friction path from the PRD: the recipient can be a complete
 * crypto novice. Magic provisions their wallet at claim time, so there is no
 * install, no seed phrase, and no session before this page.
 */

type ClaimView = {
  id: string;
  amount: number;
  token: string;
  note: string | null;
  status: string;
  claimed_at: string | null;
  recipient_input: string;
  senderHandle: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [send, setSend] = useState<ClaimView | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    linkFetch<ClaimView>(`/claim/${token}`)
      .then((data) => {
        if (!cancelled) {
          setSend(data);
          setEmail(data.recipient_input.includes("@") ? data.recipient_input : "");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      const { loginWithEmailOtp, getWalletAddress, isLoggedIn } = await import(
        "@/lib/chain/magic"
      );

      if (!(await isLoggedIn())) {
        if (!email) throw new Error("Enter your email to claim.");
        await loginWithEmailOtp(email);
      }
      const address = await getWalletAddress();
      if (!address) throw new Error("Magic returned no wallet address.");

      await linkFetch(`/claim/${token}`, { method: "POST", body: { address } });
      const refreshed = await linkFetch<ClaimView>(`/claim/${token}`);
      setSend(refreshed);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setClaiming(false);
    }
  }

  if (error && !send) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">Link expired</p>
          <p className="mt-3 font-body text-[14px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  if (!send) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono text-sm text-muted">Loading</p>
      </main>
    );
  }

  const claimed = !!send.claimed_at;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {send.senderHandle ? `From @${send.senderHandle}` : "You've received"}
        </p>
        <h1 className="mt-3 font-display text-[48px] font-bold leading-none text-text">
          {formatCurrency(send.amount)}
        </h1>
        {send.note && (
          <p className="mt-4 font-body text-[15px] italic text-muted">
            &ldquo;{send.note}&rdquo;
          </p>
        )}
      </div>

      <div className="rounded-2xl border-2 border-void bg-surface p-7 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        {claimed ? (
          <div className="text-center">
            <p className="font-body text-[15px] text-text">Claimed.</p>
            <p className="mt-2 font-body text-[13px] text-muted">
              It&apos;s in your FLOAT balance.
            </p>
          </div>
        ) : (
          <>
            <label htmlFor="claim-email" className="font-mono text-xs uppercase tracking-wide text-muted">
              Your email
            </label>
            <input
              id="claim-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border-2 border-void bg-void-3 px-4 py-3 font-body text-[15px] text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
            <p className="mt-2 font-body text-[12px] text-muted">
              We&apos;ll create your wallet automatically. No app, no seed phrase.
            </p>

            <ErrorNote message={error} className="mt-4" />

            <button
              type="button"
              onClick={claim}
              disabled={claiming || !email}
              className="mt-5 w-full rounded-full border-2 border-void bg-signal px-6 py-4 font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {claiming ? "Claiming" : "Claim it"}
            </button>
          </>
        )}
      </div>

      <p className="text-center font-mono text-[11px] text-muted-2">
        FLOAT · your money, any chain
      </p>
    </main>
  );
}
