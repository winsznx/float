import Link from "next/link";
import { ArrowUpRight, Users, Link2, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  bgClass: string;
};

const ACTIONS: QuickAction[] = [
  { label: "Send", href: "/send", icon: ArrowUpRight, bgClass: "bg-coral" },
  { label: "Split", href: "/split", icon: Users, bgClass: "bg-mint" },
  { label: "Leash", href: "/leash", icon: Link2, bgClass: "bg-lav" },
  { label: "Pledge", href: "/pledge", icon: Target, bgClass: "bg-signal" },
];

export function HomeQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ label, href, icon: Icon, bgClass }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-start gap-3 rounded-2xl border-2 border-void ${bgClass} p-4 shadow-[4px_4px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-void)]`}
        >
          <Icon size={20} color="var(--color-void)" />
          <span className="font-body text-[14px] font-semibold text-void">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
