"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const CHIPS = [
  { label: "sarah.eth", swatchClass: "bg-coral", className: "left-[2%] top-[14%]" },
  { label: "@jordan", swatchClass: "bg-mint", className: "left-[6%] top-[68%]" },
  { label: "mike.base", swatchClass: "bg-lav", className: "right-[4%] top-[8%]" },
  { label: "@priya", swatchClass: "bg-signal-faint", className: "right-[8%] top-[58%]" },
] as const;

export function HeroChips() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const chips = Array.from(container.children);

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      chips.forEach((chip, i) => {
        gsap.to(chip, {
          y: i % 2 === 0 ? -10 : 10,
          duration: 2.6 + i * 0.3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.2,
        });
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
    >
      {CHIPS.map((chip) => (
        <span
          key={chip.label}
          className={`absolute ${chip.className} rounded-full border-2 border-void ${chip.swatchClass} px-4 py-1.5 font-mono text-[12px] font-medium text-void shadow-[3px_3px_0_0_var(--color-brut-line)]`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
