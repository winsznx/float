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
        <span className="font-display text-2xl font-bold text-text">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => handleRawChange(event.target.value)}
          placeholder="0"
          aria-label="Amount"
          className="w-40 rounded-md bg-transparent text-center font-display text-3xl font-bold text-text placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        />
      </div>

      <p className="mt-2 font-body text-sm text-muted">
        USDC from your balance
      </p>

      <div className="mt-6 flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(String(amount))}
            className="rounded-full border-2 border-void bg-surface px-4 py-2 font-body text-sm font-medium text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
          >
            {amount}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(String(maxAmount))}
          className="rounded-full border-2 border-void bg-surface px-4 py-2 font-body text-sm font-medium text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
        >
          MAX
        </button>
      </div>

      {/* TODO: wire token selection UI once multi-token sourcing is supported. */}
      <button
        type="button"
        onClick={() => {}}
        className="mt-6 font-body text-[12px] text-muted underline-offset-4 hover:text-coral hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]"
      >
        Advanced
      </button>
    </div>
  );
}
