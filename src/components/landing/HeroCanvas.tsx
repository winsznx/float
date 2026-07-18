"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 34;
const LINK_DISTANCE = 130;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    function resize() {
      if (!canvas || !parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.scale(devicePixelRatio, devicePixelRatio);
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    resize();
    window.addEventListener("resize", resize);

    function drawStatic() {
      ctx!.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        ctx!.beginPath();
        ctx!.arc(particle.x, particle.y, 1.6, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(28, 23, 38, 0.16)";
        ctx!.fill();
      });
    }

    if (prefersReducedMotion) {
      drawStatic();
      return () => window.removeEventListener("resize", resize);
    }

    let frameId: number;

    function tick() {
      ctx!.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DISTANCE) {
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `rgba(124, 108, 245, ${0.14 * (1 - dist / LINK_DISTANCE)})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
      }

      particles.forEach((particle) => {
        ctx!.beginPath();
        ctx!.arc(particle.x, particle.y, 1.6, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(28, 23, 38, 0.22)";
        ctx!.fill();
      });

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
