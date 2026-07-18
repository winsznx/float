function ConvergeDiagram() {
  return (
    <svg
      viewBox="0 0 400 140"
      className="h-auto w-full max-w-md"
      aria-hidden="true"
    >
      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            .thesis-pulse { display: none; }
          }
        `}
      </style>

      <path
        id="thesis-path-1"
        d="M40 30 C 160 30, 220 70, 340 70"
        fill="none"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />
      <path
        id="thesis-path-2"
        d="M40 70 L 340 70"
        fill="none"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />
      <path
        id="thesis-path-3"
        d="M40 110 C 160 110, 220 70, 340 70"
        fill="none"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />

      <circle cx="40" cy="30" r="8" fill="var(--color-coral)" stroke="var(--color-void)" strokeWidth="1.75" />
      <circle cx="40" cy="70" r="8" fill="var(--color-mint)" stroke="var(--color-void)" strokeWidth="1.75" />
      <circle cx="40" cy="110" r="8" fill="var(--color-lav)" stroke="var(--color-void)" strokeWidth="1.75" />

      <circle cx="340" cy="70" r="12" fill="var(--color-signal)" stroke="var(--color-void)" strokeWidth="1.75" />

      <circle r="4" fill="var(--color-coral)" className="thesis-pulse">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="0s">
          <mpath href="#thesis-path-1" />
        </animateMotion>
      </circle>
      <circle r="4" fill="var(--color-mint)" className="thesis-pulse">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="0.5s">
          <mpath href="#thesis-path-2" />
        </animateMotion>
      </circle>
      <circle r="4" fill="var(--color-lav)" className="thesis-pulse">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="1s">
          <mpath href="#thesis-path-3" />
        </animateMotion>
      </circle>
    </svg>
  );
}

export function Thesis() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <h2 className="font-display text-[32px] font-bold tracking-tight text-text sm:text-[40px]">
          One line. Wherever it lives.
        </h2>
        <p className="mt-5 max-w-xl font-body text-[16px] text-muted">
          You stop keeping track of where your money is sitting. Type a name,
          FLOAT finds it and moves it. That is the whole idea.
        </p>

        <div className="mt-10 flex justify-center">
          <ConvergeDiagram />
        </div>
      </div>
    </section>
  );
}
