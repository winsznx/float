"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const CHIPS = [
  { label: "@ada.eth", swatchClass: "bg-coral", className: "left-[5%] top-[20%]", duration: 2.6, delay: 0 },
  { label: "@kofi.eth", swatchClass: "bg-mint", className: "bottom-[24%] left-[9%]", duration: 3.1, delay: 0.3 },
  { label: "@noor.eth", swatchClass: "bg-lav", className: "right-[6%] top-[26%]", duration: 2.9, delay: 0.6 },
  { label: "@diego.eth", swatchClass: "bg-mint", className: "bottom-[14%] left-[38%]", duration: 3.3, delay: 0.2 },
  { label: "@mei.eth", swatchClass: "bg-coral", className: "right-[3%] top-[6%]", duration: 2.8, delay: 0.5 },
  { label: "@zainab.eth", swatchClass: "bg-lav", className: "left-[14%] top-[80%]", duration: 3.0, delay: 0.8 },
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
          y: "+=11",
          duration: CHIPS[i].duration,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: CHIPS[i].delay,
        });
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] hidden min-[900px]:block"
    >
      {CHIPS.map((chip) => (
        <span
          key={chip.label}
          className={`absolute ${chip.className} rounded-full border-2 border-void ${chip.swatchClass} px-4 py-[7px] font-mono text-[12px] text-void`}
          style={{ boxShadow: "3px 3px 0 0 var(--color-brut-line)" }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
