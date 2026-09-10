"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight canvas-2D star drift for the profile background — no three.js.
 * Static under reduced motion, paused when the tab is hidden, fewer stars on
 * small screens. Uses the theme's muted foreground so it works in light mode.
 */
export default function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const COUNT = small ? 40 : 110;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const stars = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.2,
      v: 0.02 + Math.random() * 0.05,
      a: 0.25 + Math.random() * 0.5,
    }));

    const color = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--c-fg-mute").trim() ||
      "#82828c";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color();
      for (const s of stars) {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          s.y -= s.v / h;
          if (s.y < -0.01) {
            s.y = 1.01;
            s.x = Math.random();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced && running) raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      running = document.visibilityState === "visible";
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
