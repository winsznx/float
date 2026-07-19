import Link from "next/link";

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.29 9.42 7.86 10.95.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.45-2.7 5.42-5.28 5.71.42.36.78 1.07.78 2.16 0 1.56-.02 2.81-.02 3.19 0 .31.2.66.79.55A10.55 10.55 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.3l-7.2 8.23 8.47 11.27h-6.63l-5.2-6.8-5.94 6.8H1.72l7.7-8.8L1.28 2.25h6.8l4.7 6.22 5.46-6.22zm-1.16 17.5h1.83L6.98 4.14H5.02l12.06 15.61z" />
    </svg>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-[1.5px] border-[var(--color-brut-line)] text-muted shadow-[3px_3px_0_0_var(--color-signal-dim)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:border-signal hover:bg-signal-faint hover:text-text hover:shadow-[0_0_0_0_var(--color-signal-dim)]"
    >
      {children}
    </a>
  );
}

export function Signoff() {
  return (
    <>
      <section className="px-12 pb-[50px] pt-20 text-center">
        <h2 className="mb-3.5 font-display text-[clamp(28px,4vw,44px)] font-bold text-text">
          Money that just moves.
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-[15px] text-muted">
          Type a name. Split what is owed. Leash a balance. Pledge a goal.
          Settled on Arbitrum testnet.
        </p>

        <Link
          href="/onboarding/email"
          className="inline-flex items-center justify-center rounded-full border-2 border-void bg-signal px-[30px] py-3.5 font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:scale-[0.98] hover:bg-[#6b5ce0] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
        >
          Launch app
        </Link>

        <div className="my-10 break-words font-display text-[clamp(72px,15vw,200px)] font-bold leading-[0.9] tracking-[-0.02em] text-text">
          FLOAT
        </div>

        <div className="mb-7 flex justify-center gap-4">
          <SocialIcon href="https://github.com/winsznx/float" label="GitHub">
            <GitHubIcon />
          </SocialIcon>
          <SocialIcon href="#" label="X">
            <XIcon />
          </SocialIcon>
        </div>

        <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted-2">
          FLOAT &middot; SETTLED ON ARBITRUM
        </div>
      </section>

      <footer className="mx-auto max-w-[1180px] px-12 pb-12 pt-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-[12px] tracking-[0.04em] text-muted-2">
            Crypto has the infrastructure. FLOAT uses it.
          </span>
          <span className="font-mono text-[12px] tracking-[0.04em] text-muted-2">
            &copy; 2026 FLOAT
          </span>
        </div>
      </footer>
    </>
  );
}
