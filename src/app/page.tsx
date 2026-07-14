import Link from "next/link";

const MODES = [
  { name: "Send", subline: "Type a name. Not an address." },
  { name: "Split", subline: "Everyone settles from what they have." },
  { name: "Leash", subline: "Their key. Your rules. Your balance." },
  { name: "Pledge", subline: "Skin in the game. Onchain." },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <span className="text-[11px] font-body font-medium uppercase tracking-[0.04em] text-float-muted">
          UXmaxx · Particle · Arbitrum · Magic
        </span>

        <h1 className="mt-8 font-display text-[64px] leading-none font-extrabold tracking-tight text-float-heading">
          FLOAT
        </h1>

        <p className="mt-4 font-body text-[17px] font-medium text-float-body">
          Your money. Any chain. Just send.
        </p>

        <div className="mt-12 w-full flex flex-col gap-3">
          <Link
            href="/onboarding/email"
            className="w-full rounded-full bg-float-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90"
          >
            Continue with Email
          </Link>
          {/* TODO: wire real WalletConnect modal + EIP-7702 authorization prompt. */}
          <Link
            href="/onboarding/identity"
            className="w-full rounded-full border border-float-border bg-float-surface px-6 py-4 text-center font-body text-[15px] font-medium text-float-body transition-colors hover:bg-float-surface-2"
          >
            Connect Wallet
          </Link>
        </div>

        <div className="mt-16 w-full grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <div
              key={mode.name}
              className="rounded-2xl border border-float-border bg-float-surface p-5 text-left"
            >
              <span className="font-display text-[20px] font-bold text-float-heading">
                {mode.name}
              </span>
              <p className="mt-2 font-body text-[13px] text-float-muted">
                {mode.subline}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-16 font-mono text-[11px] tracking-[0.02em] text-float-muted">
          Crypto has the infrastructure. FLOAT uses it.
        </p>
      </div>
    </main>
  );
}
