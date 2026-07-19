"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { getBalance, type UnifiedBalance } from "@/lib/balance";

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
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);

  // The "wow moment" only lands if the numbers are the user's real holdings —
  // this is the first time they see everything they own as one figure.
  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((result) => {
        if (!cancelled) setBalance(result);
      })
      .catch(() => {
        // An empty breakdown still animates to a real $0.00 total.
        if (!cancelled) setBalance({ total: 0, chains: [], tokens: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const chains = chainRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    const total = totalRef.current;
    const value = valueRef.current;
    const glow = glowRef.current;
    if (!total || !value || !glow || !balance) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      value.textContent = formatCurrency(balance.total);
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
          value: balance.total,
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
  }, [balance]);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative flex h-28 w-full flex-col items-center justify-center gap-2">
        {(balance?.chains ?? []).map((row, i) => (
          <div
            key={row.chain}
            ref={(el) => {
              chainRefs.current[i] = el;
            }}
            className="flex items-center gap-2 font-body text-[15px] text-text"
          >
            <span className="text-muted">{row.chain}</span>
            <span className="font-mono">{formatCurrency(row.value)}</span>
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
              style={{ backgroundColor: "var(--color-signal-dim)" }}
            />
            <span
              ref={valueRef}
              className="font-display text-[40px] font-bold text-text"
            >
              $0.00
            </span>
          </div>
        </div>
      </div>

      <p
        className={`mt-8 text-center font-body text-[14px] text-muted transition-opacity duration-300 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        Here&apos;s everything you have, together.
      </p>

      <Link
        href="/home"
        className={`mt-6 w-full rounded-full border-2 border-void bg-signal px-6 py-4 text-center font-body text-[15px] font-medium text-void shadow-[5px_5px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal)] ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        Continue
      </Link>
    </div>
  );
}
