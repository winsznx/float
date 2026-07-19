"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = {
  label: string;
  href: string;
  bgClass: string;
};

const MODES: Mode[] = [
  { label: "Send", href: "/send", bgClass: "bg-coral" },
  { label: "Split", href: "/split", bgClass: "bg-mint" },
  { label: "Leash", href: "/leash", bgClass: "bg-lav" },
  { label: "Pledge", href: "/pledge", bgClass: "bg-signal" },
];

export function ModePill() {
  const pathname = usePathname();

  return (
    <div className="flex w-full gap-2 overflow-x-auto">
      {MODES.map(({ label, href, bgClass }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)] ${
              isActive
                ? `border-void text-void shadow-[3px_3px_0_0_var(--color-brut-line)] ${bgClass}`
                : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
