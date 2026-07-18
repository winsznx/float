"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Swipe } from "@/components/landing/Swipe";

const FAQS = [
  {
    question: "Do I need to know which network I am on?",
    answer:
      "FLOAT resolves the network automatically, every time you send, split, leash, or pledge.",
    bgClass: "bg-[#F2A683]",
    rotateClass: "rotate-[-1.6deg]",
  },
  {
    question: "What is the difference between Send and Pledge?",
    answer:
      "Send moves money to someone right now. Pledge locks your own money against a goal, with real stakes if you miss it.",
    bgClass: "bg-[#B8E6A8]",
    rotateClass: "rotate-[1.6deg]",
  },
  {
    question: "Is Leash actually safe to hand out?",
    answer:
      "You set the limit and the rules before anyone gets access. They can spend within them, and only within them.",
    bgClass: "bg-[#C9BFEA]",
    rotateClass: "rotate-[1.3deg]",
  },
  {
    question: "What happens if I miss a Pledge deadline?",
    answer:
      "Your stake moves to the failure destination you picked when you set it up. Real consequences, not just a reminder.",
    bgClass: "bg-[#F2A683]",
    rotateClass: "rotate-[-1.3deg]",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const inners = innerRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );

    if (prefersReducedMotion) {
      gsap.set(inners, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(inners, { opacity: 0, y: 18 });
      inners.forEach((inner, i) => {
        gsap.to(inner, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          delay: i * 0.06,
          scrollTrigger: {
            trigger: inner,
            start: "top 88%",
          },
        });
      });
    }, list);

    const refreshOnFonts = () => ScrollTrigger.refresh();
    document.fonts?.ready?.then(refreshOnFonts);

    return () => ctx.revert();
  }, []);

  return (
    <section className="mx-auto max-w-[900px] px-12 pb-[90px] pt-[70px] text-center">
      <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
        The honest answers
      </div>
      <h2 className="mb-9 mt-4 font-display text-[clamp(30px,4.2vw,48px)] font-bold text-text">
        Questions? <Swipe>Good.</Swipe>
      </h2>

      <div ref={listRef} className="flex flex-col gap-4 text-left">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={faq.question}
              className={`rounded-[26px] border-2 border-void ${faq.bgClass} ${faq.rotateClass} px-7 py-[22px] text-void transition-[transform,box-shadow] duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:rotate-0 hover:shadow-[0_0_0_0_var(--color-brut-line)]`}
              style={{ boxShadow: "5px 5px 0 0 var(--color-brut-line)" }}
            >
              <div
                ref={(el) => {
                  innerRefs.current[index] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="font-display text-[18px] font-bold">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-void text-[19px] text-surface transition-transform duration-200 ${
                      isOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="pt-3.5 text-[15px] leading-[1.5] text-void/[0.82]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 font-mono text-[13px] text-muted-2">
        Still curious? Find us on X{" "}
        <a href="#" className="text-signal no-underline hover:underline">
          @float
        </a>
        .
      </p>
    </section>
  );
}
