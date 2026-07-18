const PAIRS = [
  {
    problem:
      "Money sitting in different places depending on what you were doing when you got it. You have to remember where before you can spend it.",
    resolution:
      "FLOAT treats it as one balance. Type a name, and it sources from wherever it already sits.",
    accentClass: "bg-coral",
  },
  {
    problem:
      "A 42-character string. One typo and it is gone for good. You copy it twice and still do not trust it.",
    resolution:
      "Type a name instead. FLOAT resolves it and shows you exactly who you are paying before anything moves.",
    accentClass: "bg-mint",
  },
  {
    problem:
      "Four people, four different balances, one dinner bill. Someone always ends up chasing the other three afterward.",
    resolution:
      "Split the total once. Everyone settles in one tap from whatever they actually hold.",
    accentClass: "bg-lav",
  },
];

export function ProblemResolution() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-center font-display text-[32px] font-bold tracking-tight text-text sm:text-[40px]">
          The problem, actually
        </h2>

        <div className="mt-14 flex flex-col gap-8">
          {PAIRS.map((pair) => (
            <div
              key={pair.problem}
              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
            >
              <div className="rounded-2xl border-2 border-void bg-void-3 p-6 shadow-[4px_4px_0_0_var(--color-brut-line)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  Today
                </p>
                <p className="mt-2 font-body text-[14px] text-text">
                  {pair.problem}
                </p>
              </div>

              <span
                aria-hidden="true"
                className="hidden font-display text-2xl font-bold text-muted-2 sm:block"
              >
                &rarr;
              </span>

              <div
                className={`rounded-2xl border-2 border-void ${pair.accentClass} p-6 shadow-[4px_4px_0_0_var(--color-brut-line)]`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-void/60">
                  With FLOAT
                </p>
                <p className="mt-2 font-body text-[14px] font-medium text-void">
                  {pair.resolution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
