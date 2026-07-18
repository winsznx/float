const TRUST_ITEMS = [
  "Powered by Universal Accounts, settled on Arbitrum",
  "Non-custodial, always",
  "Every send resolves onchain",
];

export function TrustStrip() {
  return (
    <div
      className="flex flex-wrap justify-center gap-9 border-y-[0.5px] px-12 py-8"
      style={{ borderColor: "var(--color-border)" }}
    >
      {TRUST_ITEMS.map((item) => (
        <div
          key={item}
          className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-2"
        >
          <span className="h-[5px] w-[5px] rounded-full bg-signal" />
          {item}
        </div>
      ))}
    </div>
  );
}
