import Link from "next/link";

export function LandingNav() {
  return (
    <div className="fixed inset-x-0 top-[20px] z-40 flex justify-center px-4">
      <nav
        className="flex items-center gap-8 rounded-full py-3 pl-[22px] pr-[14px]"
        style={{
          background: "rgba(250,247,253,0.65)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "0.5px solid var(--color-border-strong)",
        }}
      >
        <span className="font-display text-[16px] font-bold tracking-[0.01em] text-text">
          FLOAT
        </span>

        <div className="flex items-center gap-6">
          <a
            href="#modes"
            className="hidden font-body text-sm text-muted transition-colors hover:text-text min-[900px]:inline"
          >
            Modes
          </a>
          <a
            href="#thesis"
            className="hidden font-body text-sm text-muted transition-colors hover:text-text min-[900px]:inline"
          >
            How it works
          </a>
          <Link
            href="/onboarding/email"
            className="shrink-0 rounded-full border-[1.5px] border-void bg-signal px-[22px] py-[9px] font-body text-[13px] font-medium text-void shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:scale-[0.98] hover:bg-[#6b5ce0] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
          >
            Launch app
          </Link>
        </div>
      </nav>
    </div>
  );
}
