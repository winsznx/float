function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text)"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 4L20 20" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

export function Signoff() {
  return (
    <footer className="px-6 pb-20 pt-24">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <span className="font-display text-[56px] font-bold leading-none tracking-tight text-text sm:text-[72px]">
          FLOAT
        </span>

        <p className="mt-5 font-body text-[16px] font-medium text-muted">
          Your money. Any chain. Just send.
        </p>

        <a
          href="#"
          aria-label="FLOAT on X"
          className="mt-8 flex h-10 w-10 items-center justify-center rounded-full border-2 border-void bg-surface transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
        >
          <XIcon />
        </a>
      </div>
    </footer>
  );
}
