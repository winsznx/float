"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { createRealtimeClient } from "@/lib/realtime";

/** Copy per event type. Anything unmapped falls back to the raw type. */
const LABELS: Record<string, string> = {
  send_sent: "Sent money",
  send_received: "Received money",
  split_created: "Started a split",
  split_member_settled: "A member settled",
  split_settled: "Split fully settled",
  leash_created: "Created a leash",
  leash_claimed: "Leash claimed",
  leash_spend: "Leash spent",
  leash_revoked: "Leash revoked",
  pledge_created: "Locked a pledge",
  pledge_succeeded: "Pledge kept",
  pledge_failed: "Pledge missed",
};

const ROW_CLASS =
  "flex items-center justify-between gap-3 rounded-md px-4 py-3 transition-colors";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.feed.activity.query>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      api.feed.activity
        .query()
        .then((data) => {
          if (!cancelled) setRows(data);
        })
        .catch((caught: unknown) => {
          if (!cancelled) setError(getErrorMessage(caught));
        });

    void load();

    // Realtime honors RLS, so this stream only ever carries the caller's own
    // rows — including the ones the indexer writes when a chain event lands.
    const client = createRealtimeClient();
    const channel = client
      ?.channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) void client?.removeChannel(channel);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-void bg-surface py-12 shadow-[5px_5px_0_0_var(--color-brut-line)]">
        <p className="font-body text-sm text-muted">Couldn&apos;t load activity.</p>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-void bg-surface py-12 shadow-[5px_5px_0_0_var(--color-brut-line)]">
        <p className="font-body text-sm text-muted">Loading</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-void bg-surface py-12 shadow-[5px_5px_0_0_var(--color-brut-line)]">
        <p className="font-body text-sm text-text">Nothing yet.</p>
        <p className="mt-1 font-body text-[13px] text-muted">
          Send to anyone — by name, not address.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-void bg-surface p-2 shadow-[5px_5px_0_0_var(--color-brut-line)]">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const body = (
            <>
              <span className="font-body text-[14px] text-text">
                {LABELS[row.type] ?? row.type}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-2">
                {timeAgo(row.createdAt)}
              </span>
            </>
          );

          // Every row used to link to its mode's create page, so clicking a
          // past transfer started a new one. A row with nothing to open is
          // now inert rather than misleading.
          return (
            <li key={row.id}>
              {row.href ? (
                <Link
                  href={row.href}
                  className={`${ROW_CLASS} hover:bg-void-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
                >
                  {body}
                </Link>
              ) : (
                <div className={ROW_CLASS}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
