"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Swipe } from "@/components/landing/Swipe";

const CHAIN_LABELS = [
  "ETHEREUM",
  "ARBITRUM",
  "BASE",
  "OPTIMISM",
  "POLYGON",
  "AVALANCHE",
];

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const CENTER_X = 600;
const CENTER_Y = 350;
const RADIUS = 280;

export function Thesis() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    gsap.registerPlugin(ScrollTrigger);

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const chains = CHAIN_LABELS.map((label, i) => {
      const angle = ((Math.PI * 2) / 6) * i - Math.PI / 2 + 0.35;
      return {
        label,
        x: CENTER_X + Math.cos(angle) * RADIUS,
        y: CENTER_Y + Math.sin(angle) * RADIUS,
      };
    });

    const defs = document.createElementNS(SVG_NS, "defs");
    const glow = document.createElementNS(SVG_NS, "filter");
    glow.setAttribute("id", "thesis-glow");
    glow.setAttribute("x", "-100%");
    glow.setAttribute("y", "-100%");
    glow.setAttribute("width", "300%");
    glow.setAttribute("height", "300%");
    const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
    blur.setAttribute("stdDeviation", "9");
    blur.setAttribute("result", "blur");
    const merge = document.createElementNS(SVG_NS, "feMerge");
    const m1 = document.createElementNS(SVG_NS, "feMergeNode");
    m1.setAttribute("in", "blur");
    const m2 = document.createElementNS(SVG_NS, "feMergeNode");
    m2.setAttribute("in", "SourceGraphic");
    merge.appendChild(m1);
    merge.appendChild(m2);
    glow.appendChild(blur);
    glow.appendChild(merge);
    defs.appendChild(glow);
    svg.appendChild(defs);

    const paths: SVGPathElement[] = [];

    chains.forEach((c, i) => {
      const gradId = `thesis-grad-${i}`;
      const grad = document.createElementNS(SVG_NS, "linearGradient");
      grad.setAttribute("id", gradId);
      grad.setAttribute("gradientUnits", "userSpaceOnUse");
      grad.setAttribute("x1", String(c.x));
      grad.setAttribute("y1", String(c.y));
      grad.setAttribute("x2", String(CENTER_X));
      grad.setAttribute("y2", String(CENTER_Y));
      const s1 = document.createElementNS(SVG_NS, "stop");
      s1.setAttribute("offset", "0");
      s1.setAttribute("stop-color", "#7c6cf5");
      s1.setAttribute("stop-opacity", "0.25");
      const s2 = document.createElementNS(SVG_NS, "stop");
      s2.setAttribute("offset", "1");
      s2.setAttribute("stop-color", "#7c6cf5");
      s2.setAttribute("stop-opacity", "0.9");
      grad.appendChild(s1);
      grad.appendChild(s2);
      defs.appendChild(grad);

      const g = document.createElementNS(SVG_NS, "g");
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cx", String(c.x));
      dot.setAttribute("cy", String(c.y));
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "#948da3");
      g.appendChild(dot);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(c.x));
      label.setAttribute("y", String(c.y - 14));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "thesis-chain-label");
      label.setAttribute(
        "style",
        "font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; fill:#948da3;"
      );
      label.textContent = c.label;
      g.appendChild(label);

      const pathId = `thesis-path-${i}`;
      const path = document.createElementNS(SVG_NS, "path");
      const d = `M ${c.x} ${c.y} Q ${(c.x + CENTER_X) / 2} ${(c.y + CENTER_Y) / 2}, ${CENTER_X} ${CENTER_Y}`;
      path.setAttribute("id", pathId);
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", `url(#${gradId})`);
      path.setAttribute("stroke-width", "1.4");
      const len = RADIUS * 1.05;
      path.setAttribute("stroke-dasharray", String(len));
      path.setAttribute("stroke-dashoffset", String(len));
      g.appendChild(path);
      paths.push(path);

      const particle = document.createElementNS(SVG_NS, "circle");
      particle.setAttribute("r", "2.6");
      particle.setAttribute("fill", "#7c6cf5");
      particle.setAttribute("opacity", "0");
      const motion = document.createElementNS(SVG_NS, "animateMotion");
      motion.setAttribute("dur", `${2.4 + i * 0.3}s`);
      motion.setAttribute("repeatCount", "indefinite");
      motion.setAttribute("begin", "indefinite");
      const mpath = document.createElementNS(SVG_NS, "mpath");
      mpath.setAttributeNS(XLINK_NS, "href", `#${pathId}`);
      motion.appendChild(mpath);
      particle.appendChild(motion);
      g.appendChild(particle);

      svg.appendChild(g);
    });

    const centerShape = document.createElementNS(SVG_NS, "circle");
    centerShape.setAttribute("cx", String(CENTER_X));
    centerShape.setAttribute("cy", String(CENTER_Y));
    centerShape.setAttribute("r", "0");
    centerShape.setAttribute("fill", "#7c6cf5");
    centerShape.setAttribute("filter", "url(#thesis-glow)");
    svg.appendChild(centerShape);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      paths.forEach((path) => path.setAttribute("stroke-dashoffset", "0"));
      centerShape.setAttribute("r", "14");
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: svg,
      start: "top 70%",
      once: true,
      onEnter: () => {
        paths.forEach((path, i) => {
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power2.out",
            delay: i * 0.12,
            onComplete: () => {
              const particle = path.parentNode?.querySelector(
                'circle[opacity="0"]'
              ) as (SVGCircleElement & { _motion?: SVGAnimateMotionElement }) | null;
              if (particle) {
                particle.setAttribute("opacity", "0.9");
                const motion = particle.querySelector("animateMotion") as SVGAnimateMotionElement | null;
                motion?.beginElement?.();
              }
            },
          });
        });
        gsap.to(centerShape, {
          attr: { r: 14 },
          duration: 0.8,
          delay: 0.9,
          ease: "back.out(2)",
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section
      id="thesis"
      className="flex flex-col items-center px-6 pb-[60px] pt-[70px] text-center"
    >
      <div className="mb-9 h-[460px] w-full max-w-[920px]">
        <svg
          ref={svgRef}
          viewBox="0 0 1200 700"
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full"
        />
      </div>

      <h2 className="max-w-[640px] font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.2] text-text">
        One line. <Swipe>Any chain.</Swipe>
      </h2>
      <p className="mt-4 max-w-[460px] text-[15px] text-muted">
        Every network resolves into a single line the moment it reaches you.
        That line is FLOAT.
      </p>
    </section>
  );
}
