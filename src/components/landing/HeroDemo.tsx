"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const CYCLE_MS = 3200;

type PanelId = "send" | "split" | "leash" | "pledge";

const PANELS: Array<{
  id: PanelId;
  label: string;
  tabActiveClass: string;
}> = [
  { id: "send", label: "Send", tabActiveClass: "bg-coral" },
  { id: "split", label: "Split", tabActiveClass: "bg-mint" },
  { id: "leash", label: "Leash", tabActiveClass: "bg-lav" },
  { id: "pledge", label: "Pledge", tabActiveClass: "bg-signal" },
];

function SendPanel() {
  return (
    <div>
      <span className="mb-3.5 block font-mono text-[12px] uppercase tracking-[0.1em] text-coral">
        Send to
      </span>
      <div className="font-display text-[28px] font-bold text-text">@sele.eth</div>
      <p className="mt-2.5 font-body text-[14px] text-muted">just their name</p>
    </div>
  );
}

function SplitPanel() {
  return (
    <div>
      <span className="mb-3.5 block font-mono text-[12px] uppercase tracking-[0.1em] text-mint">
        Split with
      </span>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-8 w-8 rounded-full border-[0.5px]"
            style={{
              background: "var(--color-signal-faint)",
              borderColor: "var(--color-signal-dim)",
            }}
          />
        ))}
      </div>
      <p className="mt-2.5 font-body text-[14px] text-muted">$42 each, from what they have</p>
    </div>
  );
}

function LeashPanel() {
  return (
    <div>
      <span className="mb-3.5 block font-mono text-[12px] uppercase tracking-[0.1em] text-void">
        Leash balance
      </span>
      <div className="font-display text-[28px] font-bold text-text">$1,240.00</div>
      <p className="mt-2.5 font-body text-[14px] text-muted">$50 a day, their key</p>
    </div>
  );
}

function PledgePanel() {
  return (
    <div>
      <span className="mb-3.5 block font-mono text-[12px] uppercase tracking-[0.1em] text-signal">
        Pledge
      </span>
      <div className="font-display text-[28px] font-bold text-text">$677.00 at stake</div>
      <p className="mt-2.5 font-body text-[14px] text-muted">locked until Jul 31</p>
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
      { opacity: 0, y: 8 },
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
    <div className="flex w-full max-w-[420px] flex-col items-center">
      <div
        className="relative h-[170px] w-full overflow-hidden rounded-[22px] border-2 border-void bg-lav p-[34px]"
        style={{ boxShadow: "7px 7px 0 0 var(--color-brut-line)" }}
      >
        <div ref={panelRef} className="h-full">
          <Panel />
        </div>
      </div>

      <div className="mt-[18px] flex justify-center gap-2">
        {PANELS.map((panel, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => selectPanel(index)}
              aria-label={`Show ${panel.label} preview`}
              className={`rounded-full font-body text-[13px] transition-all duration-150 ${
                isActive
                  ? `border-2 border-void text-void ${panel.tabActiveClass}`
                  : "border-[1.5px] text-muted hover:text-text"
              }`}
              style={{
                padding: "8px 18px",
                borderColor: isActive ? undefined : "var(--color-brut-line)",
                boxShadow: isActive
                  ? "3px 3px 0 0 var(--color-brut-line)"
                  : "3px 3px 0 0 var(--color-signal-dim)",
              }}
            >
              {panel.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
