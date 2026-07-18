import Link from "next/link";

export function LandingNav() {
  return (
    <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav
        className="flex w-full max-w-2xl items-center justify-between gap-6 rounded-full px-5 py-3"
        style={{
          background: "rgba(250,247,253,0.65)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "0.5px solid var(--color-border-strong)",
        }}
      >
        <span className="font-display text-[18px] font-bold tracking-tight text-text">
          FLOAT
        </span>

        <div className="hidden items-center gap-6 sm:flex">
          <a
            href="#modes"
            className="font-body text-sm font-medium text-muted transition-colors hover:text-text"
          >
            Modes
          </a>
          <a
            href="#faq"
            className="font-body text-sm font-medium text-muted transition-colors hover:text-text"
          >
            How it works
          </a>
        </div>

        <Link
          href="/onboarding/email"
          className="shrink-0 rounded-full border-2 border-void bg-signal px-4 py-2 font-body text-[13px] font-semibold text-void shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
        >
          Launch app
        </Link>
      </nav>
    </div>
  );
}
