import Link from "next/link";
import { HeroCanvas } from "@/components/landing/HeroCanvas";
import { HeroDemo } from "@/components/landing/HeroDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-36 sm:pt-44">
      <HeroCanvas />

      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col items-start text-left">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            UXmaxx &middot; Particle &middot; Arbitrum &middot; Magic
          </span>

          <h1 className="mt-6 font-display text-[clamp(52px,8vw,104px)] font-bold leading-[0.95] tracking-tight text-text">
            FLOAT
          </h1>

          <p className="mt-5 font-body text-[19px] font-medium text-text">
            Your money. Any chain. Just send.
          </p>

          <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/onboarding/email"
              className="rounded-full border-2 border-void bg-signal px-7 py-4 text-center font-body text-[15px] font-semibold text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              Continue with Email
            </Link>
            <Link
              href="/onboarding/identity"
              className="rounded-full border-2 border-void bg-surface px-7 py-4 text-center font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              Connect Wallet
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
