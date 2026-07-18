"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FAQS = [
  {
    question: "How does FLOAT know where to send my money?",
    answer:
      "It doesn't ask you to pick. Type a handle and FLOAT resolves it to a Universal Account, then sources funds from wherever your balance actually sits and delivers to wherever the recipient keeps theirs. You never choose a network or move anything yourself.",
    bgClass: "bg-coral",
    rotateClass: "rotate-[-1deg]",
  },
  {
    question: "What's the difference between Send and Pledge?",
    answer:
      "Send moves your money to someone else, right now. Pledge locks your own money against a goal you set for yourself. Hit the goal and it unlocks back to you. Miss it and it moves automatically to a destination you nominated in advance.",
    bgClass: "bg-mint",
    rotateClass: "rotate-[1.2deg]",
  },
  {
    question: "Is Leash safe? What can the other person actually do?",
    answer:
      "Only what you allow. A Leash grants a scoped key capped at an amount you set, restricted to the tokens and contracts you choose, with an expiry date. They can pull within those limits and nothing else. You can revoke at any time, and unused balance returns to you immediately.",
    bgClass: "bg-lav",
    rotateClass: "rotate-[-1.3deg]",
  },
  {
    question: "What happens if I miss a Pledge deadline?",
    answer:
      "Your nominated witness confirms or denies at the deadline. If it's marked as missed, the locked funds move automatically to the failure destination you set when you made the Pledge. There's no grace period and no override. That's what makes it work.",
    bgClass: "bg-coral",
    rotateClass: "rotate-[1deg]",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cards = cardRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );

    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    const triggers = cards.map((card) =>
      gsap.fromTo(
        card,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        }
      )
    );

    return () => {
      triggers.forEach((tween) => tween.scrollTrigger?.kill());
    };
  }, []);

  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-center font-display text-[32px] font-bold tracking-tight text-text sm:text-[40px]">
          Questions people actually ask
        </h2>

        <div className="mt-12 flex flex-col gap-5">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className={`rounded-2xl border-2 border-void ${faq.bgClass} ${faq.rotateClass} p-6 opacity-0 shadow-[5px_5px_0_0_var(--color-brut-line)]`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 text-left font-body text-[16px] font-semibold text-void"
                >
                  {faq.question}
                  <span aria-hidden="true" className="shrink-0 text-xl leading-none">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="mt-4 font-body text-[14px] leading-relaxed text-void/75">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
