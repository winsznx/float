"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type IconProps = {
  rotate: number;
};

function SendIcon({ rotate }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="absolute right-[26px] top-[26px] h-[34px] w-[34px]" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <path d="M3 11L21 3L13 21L11 13L3 11Z" fill="var(--color-void)" />
    </svg>
  );
}

function SplitIcon({ rotate }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="absolute right-[26px] top-[26px] h-[34px] w-[34px]" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <path
        d="M12 3V11M12 11L5 19M12 11L19 19"
        stroke="var(--color-void)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function LeashIcon({ rotate }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="absolute right-[26px] top-[26px] h-[34px] w-[34px]" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <rect x="3" y="9" width="10" height="10" rx="5" stroke="var(--color-void)" strokeWidth="2.2" fill="none" />
      <rect x="11" y="5" width="10" height="10" rx="5" stroke="var(--color-void)" strokeWidth="2.2" fill="none" />
    </svg>
  );
}

function PledgeIcon({ rotate }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="absolute right-[26px] top-[26px] h-[34px] w-[34px]" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.5" fill="var(--color-void)" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="var(--color-void)" strokeWidth="2.3" fill="none" />
    </svg>
  );
}

const MODES = [
  {
    name: "Send",
    subline: "Type a name. FLOAT finds the wallet.",
    bgClass: "bg-[#F2A683]",
    rotateClass: "rotate-[-1.6deg]",
    hoverClass: "hover:-translate-y-1.5 hover:rotate-[-0.7deg]",
    Icon: SendIcon,
    iconRotate: 14,
  },
  {
    name: "Split",
    subline: "Everyone settles from what they have.",
    bgClass: "bg-[#B8E6A8]",
    rotateClass: "rotate-[1.6deg]",
    hoverClass: "hover:-translate-y-1.5 hover:rotate-[0.7deg]",
    Icon: SplitIcon,
    iconRotate: -8,
  },
  {
    name: "Leash",
    subline: "Their key. Your rules. Your balance.",
    bgClass: "bg-[#C9BFEA]",
    rotateClass: "rotate-[1.3deg]",
    hoverClass: "hover:-translate-y-1.5 hover:rotate-[0.6deg]",
    Icon: LeashIcon,
    iconRotate: 11,
  },
  {
    name: "Pledge",
    subline: "Skin in the game. Onchain.",
    bgClass: "bg-[#DDD4FB]",
    rotateClass: "rotate-[-1.3deg]",
    hoverClass: "hover:-translate-y-1.5 hover:rotate-[-0.6deg]",
    Icon: PledgeIcon,
    iconRotate: -13,
  },
] as const;

export function ModeCards() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-card-inner]")
    );

    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(cards, { opacity: 0, y: 24 });
      cards.forEach((card, i) => {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          delay: i * 0.06,
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
        });
      });
    }, grid);

    const refreshOnFonts = () => ScrollTrigger.refresh();
    document.fonts?.ready?.then(refreshOnFonts);

    return () => ctx.revert();
  }, []);

  return (
    <section id="modes" className="mx-auto max-w-[1180px] px-12 pb-[90px] pt-[70px]">
      <div className="mb-[18px] text-center font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
        The four flows
      </div>
      <h2 className="mx-auto mb-11 max-w-[640px] text-center font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.2] text-text">
        One app. Four ways money moves between people.
      </h2>

      <div ref={gridRef} className="grid grid-cols-1 gap-7 min-[900px]:grid-cols-2">
        {MODES.map(({ name, subline, bgClass, rotateClass, hoverClass, Icon, iconRotate }) => (
          <div
            key={name}
            className={`relative rounded-[20px] border-2 border-void ${bgClass} ${rotateClass} ${hoverClass} p-9 shadow-[6px_6px_0_0_var(--color-brut-line)] transition-[transform,box-shadow] duration-200 hover:shadow-[9px_9px_0_0_var(--color-brut-line)]`}
          >
            <div data-card-inner className="opacity-0">
              <Icon rotate={iconRotate} />
              <span className="mb-[18px] block font-mono text-[12px] uppercase tracking-[0.1em] text-signal">
                {name.toUpperCase()}
              </span>
              <div className="mb-3 font-display text-[24px] font-bold text-void">
                {name}
              </div>
              <p className="max-w-[340px] font-body text-[15px] leading-[1.55] text-void/75">
                {subline}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
