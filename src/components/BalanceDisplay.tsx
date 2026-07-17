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
      className="w-full rounded-2xl border border-float-border bg-float-surface p-6 text-left transition-colors hover:bg-float-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--float-signal-glow)]"
    >
      <span className="font-body text-xs uppercase tracking-wide text-float-muted">
        Your balance
      </span>
      <div className="mt-2 font-display text-[40px] text-float-heading">
        <span ref={valueRef}>$0.00</span>
      </div>
      <p className="mt-2 font-body text-xs text-float-muted">
        4 chains &middot; USDC &middot; ETH &middot; MATIC
      </p>
    </button>
  );
}
