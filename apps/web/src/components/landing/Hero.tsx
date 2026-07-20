"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { HeroCanvas } from "@/components/landing/HeroCanvas";
import { HeroChips } from "@/components/landing/HeroChips";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { Swipe } from "@/components/landing/Swipe";

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const targets = root.querySelectorAll("[data-hero-in]");

    if (prefersReducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: 20 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.1,
        delay: 0.1,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-[60px] pt-[100px]"
    >
      <HeroCanvas />
      <HeroChips />

      <div className="relative z-[2] mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-16 min-[900px]:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left">
          <span
            data-hero-in
            className="mb-[26px] font-mono text-[12px] uppercase tracking-[0.18em] text-muted"
          >
            UXMAXX &middot; PARTICLE &middot; ARBITRUM &middot; MAGIC
          </span>

          <h1
            data-hero-in
            className="font-display text-[clamp(52px,8vw,104px)] font-bold leading-[0.94] tracking-[-0.01em] text-text"
          >
            FLOAT
          </h1>

          <p
            data-hero-in
            className="mt-[22px] text-[clamp(18px,2.2vw,24px)] font-normal text-text"
          >
            Your money. Any chain. <Swipe>Just send.</Swipe>
          </p>

          <p
            data-hero-in
            className="mt-[14px] font-mono text-[13px] text-muted-2"
          >
            handles instead of addresses. networks resolved for you. bills that split themselves.
          </p>

          <div
            data-hero-in
            className="mt-9 flex w-full flex-col gap-3.5 min-[480px]:w-auto min-[480px]:flex-row"
          >
            <Link
              href="/onboarding/email"
              className="inline-flex items-center justify-center rounded-full border-2 border-void bg-signal px-[30px] py-3.5 text-center font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:scale-[0.98] hover:bg-[#6b5ce0] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]"
            >
              Continue with email
            </Link>
            <ConnectWalletButton className="inline-flex items-center justify-center rounded-full border-2 px-[30px] py-3.5 text-center font-body text-[15px] font-medium text-text shadow-[5px_5px_0_0_var(--color-signal)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:scale-[0.98] hover:bg-signal-faint hover:shadow-[0_0_0_0_var(--color-signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)]" />
          </div>
        </div>

        <div data-hero-in className="flex justify-center min-[900px]:justify-end">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
