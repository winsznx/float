"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { createRealtimeClient } from "@/lib/realtime";
import { NotificationPanel, type Notification } from "@/components/NotificationPanel";

export function TopBar() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      api.feed.notifications
        .query()
        .then((rows) => {
          if (cancelled) return;
          setItems(rows as Notification[]);
          setUnread(rows.filter((r) => !r.read).length);
        })
        .catch(() => {
          // A badge isn't worth surfacing an error for; it just stays at 0.
          if (!cancelled) setUnread(0);
        });

    void load();

    // The avatar was a permanently empty circle even after uploading one.
    api.auth.me
      .query()
      .then((me) => {
        if (!cancelled) setAvatarUrl(me.avatar_url ?? null);
      })
      .catch(() => {
        // Falls back to the empty circle.
      });

    // The indexer writes notifications when chain events land, so this has to
    // be live rather than fetched once on mount.
    const client = createRealtimeClient();
    const channel = client
      ?.channel("notifications-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) void client?.removeChannel(channel);
    };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Opening is what marks them read — a dot that clears without being read
    // is worse than no dot.
    if (!next || unread === 0) return;
    setUnread(0);
    try {
      await api.feed.markRead.mutate();
    } catch {
      // A reload will show the true count again if this didn't stick.
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-page px-5">
      {/* Was plain text, so from a mode page there was no way back to home
          short of the browser button. */}
      <Link
        href="/home"
        aria-label="FLOAT home"
        className="font-display text-[20px] font-bold tracking-tight text-text transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
      >
        FLOAT
      </Link>

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal" />
          )}
        </button>

        {open && <NotificationPanel items={items} onClose={() => setOpen(false)} />}

        <Link
          href="/account"
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-void bg-void-3 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
        >
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Supabase storage, not an optimizable static asset
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          )}
        </Link>
      </div>
    </header>
  );
}
