"use client";

import { useCallback, type RefObject } from "react";
import { useOsStore } from "./store";
import { APP_META } from "./apps.meta";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * Pointer-driven window drag. During the drag we mutate the element's
 * transform directly (rAF-batched) so React never re-renders mid-move; the
 * final position is committed to the store once on pointer-up.
 */
export function useWindowDrag(
  id: string,
  elRef: RefObject<HTMLElement | null>,
) {
  return useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = elRef.current;
      const win = useOsStore.getState().windows.find((w) => w.id === id);
      if (!el || !win || win.maximized) return;

      useOsStore.getState().focusWindow(id);

      const startX = win.x;
      const startY = win.y;
      const originPx = e.clientX;
      const originPy = e.clientY;
      const min = APP_META[win.appId].minSize;

      let nx = startX;
      let ny = startY;
      let raf = 0;

      const move = (ev: PointerEvent) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        nx = clamp(
          startX + (ev.clientX - originPx),
          -(win.w - 120),
          vw - 120,
        );
        ny = clamp(startY + (ev.clientY - originPy), 44, vh - 48);
        if (!raf) {
          raf = requestAnimationFrame(() => {
            el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
            raf = 0;
          });
        }
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (raf) cancelAnimationFrame(raf);
        useOsStore.getState().moveResize(id, { x: nx, y: ny });
        void min; // min-size used by the resize hook (phase 2)
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [id, elRef],
  );
}
