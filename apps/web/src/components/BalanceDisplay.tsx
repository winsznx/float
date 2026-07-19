"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getBalance, type UnifiedBalance } from "@/lib/balance";
import { getErrorMessage } from "@/lib/errors";

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
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((result) => {
        if (!cancelled) setBalance(result);
      })
      .catch((caught: unknown) => {
        // Without this the counter sits at $0.00 with no explanation.
        if (!cancelled) setError(getErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Counts up once the real balance arrives, so what's on screen is always
  // live Universal Account state rather than a placeholder.
  useEffect(() => {
    const el = valueRef.current;
    if (!el || !balance) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      el.textContent = formatCurrency(balance.total);
      return;
    }

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: balance.total,
      duration: 0.4,
      ease: "power4.out",
      onUpdate: () => {
        el.textContent = formatCurrency(counter.value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [balance]);

  const chainCount = balance?.chains.length ?? 0;
  const subline = error
    ? "Balance unavailable"
    : balance
      ? [`${chainCount} ${chainCount === 1 ? "chain" : "chains"}`, ...balance.tokens].join(" · ")
      : "Loading";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border-2 border-void bg-signal p-6 text-left shadow-[6px_6px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-void)]"
    >
      <span className="font-mono text-xs uppercase tracking-wide text-void/70">
        Your balance
      </span>
      <div className="mt-2 font-display text-[40px] font-bold text-void">
        <span ref={valueRef}>{balance ? formatCurrency(balance.total) : "$0.00"}</span>
      </div>
      <p className="mt-2 font-mono text-xs text-void/60">{subline}</p>
    </button>
  );
}
