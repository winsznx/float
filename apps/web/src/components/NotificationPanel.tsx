"use client";

import { useEffect, useRef } from "react";

/**
 * Notification list.
 *
 * The bell previously only showed a dot — there was no way to read what had
 * actually happened, which matters most for the events the indexer writes:
 * someone spent from your leash, a pledge resolved.
 */

export type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

function describe(n: Notification): string {
  const amount = typeof n.payload.amount === "number" ? n.payload.amount : null;
  const money = amount === null ? "" : `$${amount.toFixed(2)}`;

  switch (n.type) {
    case "leash_spend": {
      const remaining =
        typeof n.payload.remaining === "number" ? ` · ${`$${n.payload.remaining.toFixed(2)}`} left` : "";
      return `${money} spent from your leash${remaining}`;
    }
    case "pledge_succeeded":
      return `Pledge kept — ${money} returned`;
    case "pledge_failed":
      return `Pledge missed — ${money} slashed`;
    case "witness_request":
      return `You've been asked to witness a pledge`;
    default:
      return n.type.replace(/_/g, " ");
  }
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationPanel({
  items,
  onClose,
}: {
  items: Notification[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Dismiss on outside click or Escape, so the panel never traps the user.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-12 z-50 w-[300px] rounded-2xl border-2 border-void bg-surface p-4 shadow-[7px_7px_0_0_var(--color-brut-line)]"
    >
      <p className="font-mono text-xs uppercase tracking-wide text-muted">Notifications</p>

      {items.length === 0 ? (
        <p className="mt-4 font-body text-[13px] text-muted">Nothing yet.</p>
      ) : (
        <ul className="mt-3 flex max-h-[320px] flex-col gap-3 overflow-y-auto">
          {items.slice(0, 20).map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] leading-[1.4] text-text">
                {describe(item)}
              </span>
              <span className="font-mono text-[10px] text-muted-2">
                {timeAgo(item.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
