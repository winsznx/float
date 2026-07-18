"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Users, Link2, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Send", href: "/send", icon: ArrowUpRight },
  { label: "Split", href: "/split", icon: Users },
  { label: "Leash", href: "/leash", icon: Link2 },
  { label: "Pledge", href: "/pledge", icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-surface px-2 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const isSend = href === "/send";
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 font-body text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)] ${
              isActive ? (isSend ? "text-coral" : "text-signal") : "text-muted"
            }`}
          >
            <Icon
              size={22}
              color={
                isActive
                  ? isSend
                    ? "var(--color-coral)"
                    : "var(--color-signal)"
                  : "currentColor"
              }
            />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        aria-label="Account"
        className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
      >
        <span className="h-[22px] w-[22px] rounded-full border border-border bg-void-3" />
        <span className="font-body text-xs text-muted">You</span>
      </button>
    </nav>
  );
}
