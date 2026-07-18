"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const CYCLE_MS = 3200;

type PanelId = "send" | "split" | "leash" | "pledge";

const PANELS: Array<{
  id: PanelId;
  label: string;
  accent: string;
  swatchClass: string;
}> = [
  { id: "send", label: "Send", accent: "var(--color-coral)", swatchClass: "bg-coral" },
  { id: "split", label: "Split", accent: "var(--color-mint)", swatchClass: "bg-mint" },
  { id: "leash", label: "Leash", accent: "var(--color-lav)", swatchClass: "bg-lav" },
  { id: "pledge", label: "Pledge", accent: "var(--color-signal)", swatchClass: "bg-signal-faint" },
];

function SendPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">To</p>
        <p className="mt-1 font-body text-[15px] font-medium text-text">tim.eth</p>
        <p className="mt-6 font-display text-4xl font-bold text-text">$50.00</p>
      </div>
      <div className="rounded-full border-2 border-void bg-coral px-6 py-3 text-center font-body text-[14px] font-semibold text-void shadow-[4px_4px_0_0_var(--color-brut-line)]">
        Send
      </div>
    </div>
  );
}

function SplitPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Dinner</p>
        <p className="mt-1 font-display text-3xl font-bold text-text">$84.00</p>
        <div className="mt-5 flex -space-x-2">
          {["A", "B", "C", "D"].map((letter) => (
            <span
              key={letter}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-void bg-void-3 font-body text-[12px] font-semibold text-text"
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-full border-2 border-void bg-mint px-6 py-3 text-center font-body text-[14px] font-semibold text-void shadow-[4px_4px_0_0_var(--color-brut-line)]">
        Your share: $21.00
      </div>
    </div>
  );
}

function LeashPanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Leash to</p>
        <p className="mt-1 font-body text-[15px] font-medium text-text">@contractor</p>
        <p className="mt-6 font-display text-3xl font-bold text-text">$500 cap</p>
      </div>
      <div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-void bg-void-3">
          <div className="h-full w-[38%] bg-lav" />
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted">$190 used of $500</p>
      </div>
    </div>
  );
}

function PledgePanel() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Goal</p>
        <p className="mt-1 font-body text-[15px] font-medium text-text">Launch by Friday</p>
        <p className="mt-6 font-display text-3xl font-bold text-text">$200 locked</p>
      </div>
      <div className="rounded-full border-2 border-void bg-signal-faint px-6 py-3 text-center font-body text-[14px] font-semibold text-text shadow-[4px_4px_0_0_var(--color-brut-line)]">
        Witness: @co-founder
      </div>
    </div>
  );
}

const PANEL_CONTENT: Record<PanelId, () => React.ReactElement> = {
  send: SendPanel,
  split: SplitPanel,
  leash: LeashPanel,
  pledge: PledgePanel,
};

export function HeroDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timeoutRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PANELS.length);
    }, CYCLE_MS);
    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    );
  }, [activeIndex]);

  function selectPanel(index: number) {
    setActiveIndex(index);
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    timeoutRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PANELS.length);
    }, CYCLE_MS);
  }

  const active = PANELS[activeIndex];
  const Panel = PANEL_CONTENT[active.id];

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <div
        className="h-64 w-full rounded-2xl border-2 border-void bg-surface p-6 shadow-[7px_7px_0_0_var(--color-brut-line)]"
        style={{ borderColor: "var(--color-void)" }}
      >
        <div ref={panelRef} className="h-full">
          <Panel />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {PANELS.map((panel, index) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => selectPanel(index)}
            aria-label={`Show ${panel.label} preview`}
            className={`rounded-full border-2 border-void px-4 py-1.5 font-body text-[13px] font-medium transition-all duration-150 ${
              index === activeIndex
                ? `${panel.swatchClass} text-void shadow-[3px_3px_0_0_var(--color-brut-line)]`
                : "bg-surface text-muted hover:text-text"
            }`}
          >
            {panel.label}
          </button>
        ))}
      </div>
    </div>
  );
}
