"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = {
  label: string;
  href: string;
};

const MODES: Mode[] = [
  { label: "Send", href: "/send" },
  { label: "Split", href: "/split" },
  { label: "Leash", href: "/leash" },
  { label: "Pledge", href: "/pledge" },
];

export function ModePill() {
  const pathname = usePathname();

  return (
    <div className="flex w-full gap-2 overflow-x-auto">
      {MODES.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)] ${
              isActive
                ? "bg-float-signal text-float-heading"
                : "text-float-muted hover:-translate-y-px hover:text-float-body"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
