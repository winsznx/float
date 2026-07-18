"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const MOCK_BALANCE = 1247.83;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type BalanceDisplayProps = {
  onOpen?: () => void;
};

export function BalanceDisplay({ onOpen }: BalanceDisplayProps) {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      el.textContent = formatCurrency(MOCK_BALANCE);
      return;
    }

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: MOCK_BALANCE,
      duration: 0.4,
      ease: "power4.out",
      onUpdate: () => {
        el.textContent = formatCurrency(counter.value);
      },
    });

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border-2 border-void bg-surface p-6 text-left shadow-[6px_6px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
    >
      <span className="font-mono text-xs uppercase tracking-wide text-muted">
        Your balance
      </span>
      <div className="mt-2 font-display text-[40px] font-bold text-text">
        <span ref={valueRef}>$0.00</span>
      </div>
      <p className="mt-2 font-mono text-xs text-muted-2">
        4 chains &middot; USDC &middot; ETH &middot; MATIC
      </p>
    </button>
  );
}
