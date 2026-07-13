import { Bell } from "lucide-react";

type TopBarProps = {
  hasUnread?: boolean;
};

export function TopBar({ hasUnread = true }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-float-border bg-float-void px-5">
      <span className="font-display text-[20px] font-extrabold tracking-tight text-float-heading">
        FLOAT
      </span>
      <button
        type="button"
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-float-muted transition-colors hover:text-float-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-float-signal" />
        )}
      </button>
    </header>
  );
}
