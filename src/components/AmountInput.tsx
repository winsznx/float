"use client";

const QUICK_AMOUNTS = [25, 50, 100];

type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  maxAmount: number;
};

export function AmountInput({ value, onChange, maxAmount }: AmountInputProps) {
  function handleRawChange(next: string) {
    if (next === "" || /^\d*\.?\d{0,2}$/.test(next)) {
      onChange(next);
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-float-heading">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => handleRawChange(event.target.value)}
          placeholder="0"
          aria-label="Amount"
          className="w-40 rounded-md bg-transparent text-center font-display text-3xl font-extrabold text-float-heading placeholder:text-float-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
        />
      </div>

      <p className="mt-2 font-body text-sm text-float-muted">
        USDC from your balance
      </p>

      <div className="mt-6 flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(String(amount))}
            className="rounded-full bg-float-surface-2 px-4 py-2 font-body text-sm text-float-body transition-colors hover:bg-float-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
          >
            {amount}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(String(maxAmount))}
          className="rounded-full bg-float-surface-2 px-4 py-2 font-body text-sm text-float-body transition-colors hover:bg-float-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
        >
          MAX
        </button>
      </div>

      {/* TODO: wire token selection UI once multi-token sourcing is supported. */}
      <button
        type="button"
        onClick={() => {}}
        className="mt-6 font-body text-[12px] text-float-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
      >
        Advanced
      </button>
    </div>
  );
}
