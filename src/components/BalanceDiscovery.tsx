"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

const CHAIN_BALANCES = [
  { chain: "Base", value: 420.5 },
  { chain: "Arbitrum", value: 612.1 },
  { chain: "Polygon", value: 215.23 },
];

const TOTAL = 1247.83;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function BalanceDiscovery() {
  const chainRefs = useRef<Array<HTMLDivElement | null>>([]);
  const totalRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const chains = chainRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    const total = totalRef.current;
    const value = valueRef.current;
    const glow = glowRef.current;
    if (!total || !value || !glow) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      value.textContent = formatCurrency(TOTAL);
      gsap.set(chains, { opacity: 0 });
      gsap.set(total, { opacity: 1 });
      const frame = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(frame);
    }

    const counter = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => setRevealed(true),
    });

    tl.set(chains, { opacity: 0, y: 8 })
      .set(total, { opacity: 0 })
      .set(glow, { opacity: 0 })
      .to(chains, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 })
      .to(
        chains,
        { opacity: 0, y: -8, duration: 0.3, stagger: 0.05 },
        "+=0.4"
      )
      .to(total, { opacity: 1, duration: 0.2 }, "<")
      .to(
        counter,
        {
          value: TOTAL,
          duration: 0.4,
          ease: "expo.out",
          onUpdate: () => {
            value.textContent = formatCurrency(counter.value);
          },
        },
        "<"
      )
      .to(glow, { opacity: 1, duration: 0.15 })
      .to(glow, { opacity: 0, duration: 0.35 });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative flex h-28 w-full flex-col items-center justify-center gap-2">
        {CHAIN_BALANCES.map((balance, i) => (
          <div
            key={balance.chain}
            ref={(el) => {
              chainRefs.current[i] = el;
            }}
            className="flex items-center gap-2 font-body text-[15px] text-float-body"
          >
            <span className="text-float-muted">{balance.chain}</span>
            <span className="font-mono">{formatCurrency(balance.value)}</span>
          </div>
        ))}

        <div
          ref={totalRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0"
        >
          <div className="relative flex items-center justify-center">
            <div
              ref={glowRef}
              className="absolute inset-0 -z-10 scale-150 rounded-full opacity-0 blur-2xl"
              style={{ backgroundColor: "var(--float-signal-glow)" }}
            />
            <span
              ref={valueRef}
              className="font-display text-[40px] font-extrabold text-float-heading"
            >
              $0.00
            </span>
          </div>
        </div>
      </div>

      <p
        className={`mt-8 text-center font-body text-[15px] text-float-body transition-opacity duration-300 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        Here&apos;s everything you have, together.
      </p>

      <Link
        href="/home"
        className={`mt-8 w-full rounded-full bg-float-signal px-6 py-4 text-center font-body text-[15px] font-semibold text-float-heading transition-colors hover:bg-float-signal/90 ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        Continue
      </Link>
    </div>
  );
}
