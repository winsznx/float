"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

/**
 * Past items for a mode.
 *
 * Every mode was write-only: you could create a split, leash, or pledge, then
 * reload and it was gone from the UI entirely. The list endpoints existed on
 * the API and nothing ever called them.
 */

type Row = {
  id: string;
  title: string;
  amount: number;
  status: string;
  statusTone: "neutral" | "good" | "bad";
  href?: string;
  createdAt: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

async function loadRows(mode: "send" | "split" | "leash" | "pledge"): Promise<Row[]> {
  if (mode === "send") {
    const rows = await api.send.list.query();
    return rows.map((r) => ({
      id: r.id,
      title: r.recipient_input,
      amount: r.amount,
      status: r.status,
      statusTone: r.status === "confirmed" ? "good" : r.status === "failed" ? "bad" : "neutral",
      href: `/r/${r.share_token}`,
      createdAt: r.created_at,
    }));
  }

  if (mode === "split") {
    const rows = await api.split.list.query();
    return rows.map((r) => {
      const members = r.split_members ?? [];
      const settled = members.filter((m) => m.settled).length;
      return {
        id: r.id,
        title: r.name ?? "Split",
        amount: r.total_amount,
        status: `${settled}/${members.length} settled`,
        statusTone: settled === members.length && members.length > 0 ? "good" : "neutral",
        href: r.share_link_token ? `/settle/${r.share_link_token}` : undefined,
        createdAt: r.created_at,
      };
    });
  }

  if (mode === "leash") {
    const rows = await api.leash.list.query();
    return rows.map((r) => ({
      id: r.id,
      title: r.beneficiary_ref,
      amount: r.spend_limit,
      status: r.revoked
        ? "revoked"
        : `${formatCurrency(r.spent)} of ${formatCurrency(r.spend_limit)} used`,
      statusTone: r.revoked ? "bad" : "neutral",
      createdAt: r.created_at,
    }));
  }

  const rows = await api.pledge.list.query();
  return rows.map((r) => ({
    id: r.id,
    title: r.goal,
    amount: r.stake_amount,
    status: r.status,
    statusTone: r.status === "succeeded" ? "good" : r.status === "failed" ? "bad" : "neutral",
    href: r.is_public ? `/pledge/${r.id}` : undefined,
    createdAt: r.created_at,
  }));
}

const TONE_CLASS: Record<Row["statusTone"], string> = {
  neutral: "text-muted",
  good: "text-text",
  bad: "text-coral",
};

export function ModeHistory({ mode }: { mode: "send" | "split" | "leash" | "pledge" }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRows(mode)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Nothing to show yet is the normal first-run state, so stay quiet rather
  // than rendering an empty box above the create flow.
  if (error || !rows || rows.length === 0) return null;

  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-void bg-surface p-6 shadow-[7px_7px_0_0_var(--color-brut-line)]">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        Yours ({rows.length})
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {rows.slice(0, 8).map((row) => {
          const body = (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[14px] text-text">{row.title}</p>
                <p className={`font-body text-[12px] ${TONE_CLASS[row.statusTone]}`}>
                  {row.status}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-body text-[14px] text-text">{formatCurrency(row.amount)}</p>
                <p className="font-mono text-[11px] text-muted-2">{timeAgo(row.createdAt)}</p>
              </div>
            </>
          );

          return (
            <li key={row.id}>
              {row.href ? (
                <Link
                  href={row.href}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-void-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-2 py-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
