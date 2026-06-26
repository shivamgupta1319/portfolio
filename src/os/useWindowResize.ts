"use client";

import { useCallback, type RefObject } from "react";
import { useOsStore } from "./store";
import { APP_META } from "./apps.meta";

export type ResizeEdge = "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * Pointer-driven window resize. Like the drag hook, it mutates the element's
 * geometry directly during the gesture and commits the final rect once on
 * pointer-up, so React doesn't re-render on every move.
 */
export function useWindowResize(
  id: string,
  elRef: RefObject<HTMLElement | null>,
) {
  return useCallback(
    (e: React.PointerEvent, edge: ResizeEdge) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const el = elRef.current;
      const win = useOsStore.getState().windows.find((w) => w.id === id);
      if (!el || !win || win.maximized) return;

      useOsStore.getState().focusWindow(id);

      const min = APP_META[win.appId].minSize;
      const startX = win.x;
      const startY = win.y;
      const startW = win.w;
      const startH = win.h;
      const px = e.clientX;
      const py = e.clientY;

      let rect = { x: startX, y: startY, w: startW, h: startH };
      let raf = 0;

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - px;
        const dy = ev.clientY - py;
        let { x, y, w, h } = { x: startX, y: startY, w: startW, h: startH };

        if (edge.includes("e")) w = startW + dx;
        if (edge.includes("s")) h = startH + dy;
        if (edge.includes("w")) {
          w = startW - dx;
          x = startX + dx;
        }
        if (edge.includes("n")) {
          h = startH - dy;
          y = startY + dy;
        }

        // enforce minimums, keeping the anchored edge fixed
        if (w < min.w) {
          if (edge.includes("w")) x = startX + (startW - min.w);
          w = min.w;
        }
        if (h < min.h) {
          if (edge.includes("n")) y = startY + (startH - min.h);
          h = min.h;
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        w = clamp(w, min.w, vw);
        h = clamp(h, min.h, vh);
        y = clamp(y, 44, vh - 48);

        rect = { x, y, w, h };
        if (!raf) {
          raf = requestAnimationFrame(() => {
            el.style.width = `${rect.w}px`;
            el.style.height = `${rect.h}px`;
            el.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
            raf = 0;
          });
        }
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (raf) cancelAnimationFrame(raf);
        useOsStore.getState().moveResize(id, rect);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [id, elRef],
  );
}
