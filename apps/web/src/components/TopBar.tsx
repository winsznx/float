import { Bell } from "lucide-react";

type TopBarProps = {
  hasUnread?: boolean;
};

export function TopBar({ hasUnread = true }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-page px-5">
      <span className="font-display text-[20px] font-bold tracking-tight text-text">
        FLOAT
      </span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
        >
          <Bell size={20} />
          {hasUnread && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-signal" />
          )}
        </button>

        <button
          type="button"
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-void bg-void-3 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
        />
      </div>
    </header>
  );
}
