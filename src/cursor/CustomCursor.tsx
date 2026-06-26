"use client";

import { useEffect, useRef, useState } from "react";

/** Game-style reticle cursor. Disabled on touch / reduced-motion. */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!fine || reduced) return;
    const enableRaf = requestAnimationFrame(() => setEnabled(true));
    document.body.classList.add("cursor-none");

    let rx = window.innerWidth / 2;
    let ry = window.innerHeight / 2;
    let raf = 0;

    const move = (e: PointerEvent) => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      // ring eases toward the pointer
      if (!raf) {
        const step = () => {
          rx += (e.clientX - rx) * 0.2;
          ry += (e.clientY - ry) * 0.2;
          if (ringRef.current) {
            ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
          }
          if (Math.abs(e.clientX - rx) > 0.5 || Math.abs(e.clientY - ry) > 0.5) {
            raf = requestAnimationFrame(step);
          } else {
            raf = 0;
          }
        };
        raf = requestAnimationFrame(step);
      }
    };

    const setHover = (e: PointerEvent) => {
      const interactive = (e.target as HTMLElement)?.closest(
        "button, a, input, .cursor-grab",
      );
      ringRef.current?.classList.toggle("cursor-ring--hot", !!interactive);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", setHover);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", setHover);
      document.body.classList.remove("cursor-none");
      cancelAnimationFrame(enableRaf);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed -ml-[3px] -mt-[3px] left-0 top-0 z-[70] h-1.5 w-1.5 rounded-full bg-cyan"
      />
      <div
        ref={ringRef}
        className="cursor-ring pointer-events-none fixed -ml-3.5 -mt-3.5 left-0 top-0 z-[70] h-7 w-7 rounded-full border border-accent-2/70 transition-[width,height,background-color] duration-150"
      />
    </>
  );
}
