import Link from "next/link";

export function HomePromoCard() {
  return (
    <Link
      href="/leash"
      className="flex w-full flex-col justify-between rounded-2xl border-2 border-void bg-void-3 p-6 shadow-[6px_6px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
    >
      <span className="font-mono text-xs uppercase tracking-wide text-muted">
        Do more
      </span>
      <div>
        <p className="mt-2 font-display text-[19px] font-bold text-text">
          Do more with FLOAT
        </p>
        <p className="mt-2 font-body text-[13px] text-muted">
          Hand out a Leash or lock in a Pledge.
        </p>
      </div>
    </Link>
  );
}
