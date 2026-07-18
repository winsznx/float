"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Swipe } from "@/components/landing/Swipe";

const PROBLEMS = [
  "Copy the wrong address, lose the money.",
  "A different token for every network, just to cover the cost of moving your own money.",
  "Splitting a bill turns into a spreadsheet nobody opens again.",
];

export function ProblemResolution() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heading = headingRef.current;
    const list = listRef.current;
    const panel = panelRef.current;
    if (!heading || !list || !panel) return;

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const rows = Array.from(list.children);

    if (prefersReducedMotion) {
      gsap.set([heading, ...rows, panel], { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(heading, { opacity: 0, y: 20 });
      gsap.to(heading, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        scrollTrigger: { trigger: heading, start: "top 85%" },
      });

      gsap.set(rows, { opacity: 0, y: 16 });
      rows.forEach((row, i) => {
        gsap.to(row, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.1,
          scrollTrigger: { trigger: row, start: "top 90%" },
        });
      });

      gsap.set(panel, { opacity: 0, y: 20 });
      gsap.to(panel, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        scrollTrigger: { trigger: panel, start: "top 85%" },
      });
    });

    const refreshOnFonts = () => ScrollTrigger.refresh();
    document.fonts?.ready?.then(refreshOnFonts);

    return () => ctx.revert();
  }, []);

  return (
    <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-12 px-12 pb-[90px] pt-[60px] min-[900px]:grid-cols-2 min-[900px]:gap-20">
      <div>
        <h2
          ref={headingRef}
          className="font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.2] text-text"
        >
          Money still moves like it&apos;s <Swipe>2015.</Swipe>
        </h2>

        <div ref={listRef} className="mt-10 flex flex-col gap-[26px]">
          {PROBLEMS.map((problem) => (
            <div key={problem} className="flex items-start gap-4">
              <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
              <p className="text-[16px] leading-[1.5] text-muted">{problem}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={panelRef}
        className="rounded-[20px] border-2 border-void bg-mint p-10"
        style={{ boxShadow: "6px 6px 0 0 var(--color-brut-line)" }}
      >
        <p className="text-[18px] leading-[1.6] text-void">
          FLOAT resolves all three into <Swipe>one motion</Swipe>. Type a
          name, pick an amount, done. What&apos;s underneath is not your
          problem anymore.
        </p>
        <div className="mt-7 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-2">
          Network abstracted by default
        </div>
      </div>
    </section>
  );
}
