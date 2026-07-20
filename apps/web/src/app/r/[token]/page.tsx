"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { linkFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { downloadReceiptImage } from "@/lib/receipt-image";

/**
 * Public receipt for a send.
 *
 * Shared receipts used to point at Particle's explorer, which showed a
 * bundler's view of a userOp — unreadable to the person receiving the link,
 * and it exposed the sender's whole activity history. This is FLOAT's own
 * record of the payment, carrying only what a receipt should.
 */

type Receipt = {
  amount: number;
  token: string;
  note: string | null;
  status: string;
  recipient_input: string;
  recipient_type: string;
  tx_hash: string | null;
  created_at: string;
  senderHandle: string | null;
  senderAvatarUrl: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    linkFetch<Receipt>(`/receipt/${token}`)
      .then((data) => {
        if (!cancelled) setReceipt(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function saveImage() {
    if (!receipt) return;
    setSaving(true);
    setError(null);
    try {
      await downloadReceiptImage({
        amount: receipt.amount,
        recipientLabel: receipt.recipient_input,
        senderHandle: receipt.senderHandle,
        timestamp: new Date(receipt.created_at).getTime(),
        note: receipt.note,
        status: receipt.status,
        txId: receipt.tx_hash,
      });
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  if (error && !receipt) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-8 text-center shadow-[7px_7px_0_0_var(--color-brut-line)]">
          <p className="font-display text-[20px] font-bold text-text">Receipt unavailable</p>
          <p className="mt-3 font-body text-[14px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono text-sm text-muted">Loading</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="rounded-2xl border-2 border-void bg-surface p-8 shadow-[7px_7px_0_0_var(--color-brut-line)]">
        <p className="text-center font-mono text-xs uppercase tracking-wide text-muted">
          {receipt.senderHandle ? `From @${receipt.senderHandle}` : "Payment"}
        </p>

        <h1 className="mt-4 text-center font-display text-[48px] font-bold leading-none text-text">
          {formatCurrency(receipt.amount)}
        </h1>
        <p className="mt-2 text-center font-body text-[15px] text-muted">
          to {receipt.recipient_input}
        </p>

        {receipt.note && (
          <p className="mt-4 text-center font-body text-[14px] italic text-muted">
            &ldquo;{receipt.note}&rdquo;
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2 border-t-2 border-border-strong pt-6">
          <p className="flex justify-between font-body text-[13px] text-text">
            <span className="text-muted">Date</span>
            <span className="font-mono">
              {new Date(receipt.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
          <p className="flex justify-between font-body text-[13px] text-text">
            <span className="text-muted">Status</span>
            <span className="font-mono">{receipt.status}</span>
          </p>
          <p className="flex justify-between font-body text-[13px] text-text">
            <span className="text-muted">Asset</span>
            <span className="font-mono">{receipt.token}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={saveImage}
          disabled={saving}
          className="mt-8 w-full rounded-full border-2 border-void bg-surface px-6 py-4 font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {saving ? "Saving" : "Save as image"}
        </button>

        {error && <p className="mt-3 text-center font-body text-[13px] text-coral">{error}</p>}
      </div>

      <Link
        href="/"
        className="text-center font-mono text-[11px] text-muted-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        FLOAT · your money, any chain
      </Link>
    </main>
  );
}
