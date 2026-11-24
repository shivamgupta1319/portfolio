"use client";

import { useEffect, useRef, useState } from "react";

export type ProbeState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up"; ms: number }
  | { kind: "down" };

const TIMEOUT_MS = 6000;

/**
 * Checks from the visitor's own browser whether an app answers, by loading a
 * small public image from its host. An image (not fetch) because cross-origin
 * fetches are opaque, and a Cloudflare error page would still look like a
 * response; an HTML error page fails to decode as an image, so it reads as
 * down. The query string bypasses the edge cache so the origin must answer.
 *
 * The probe only starts once the element is on screen.
 */
export function useProbe<T extends Element>(url: string | undefined) {
  const ref = useRef<T>(null);
  const [state, setState] = useState<ProbeState>({ kind: "idle" });

  useEffect(() => {
    const el = ref.current;
    if (!url || !el) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let img: HTMLImageElement | undefined;

    const run = () => {
      setState({ kind: "checking" });
      img = new Image();
      const started = performance.now();
      const done = (next: ProbeState) => {
        if (cancelled) return;
        cancelled = true;
        if (timer) clearTimeout(timer);
        setState(next);
      };
      img.onload = () => done({ kind: "up", ms: Math.round(performance.now() - started) });
      img.onerror = () => done({ kind: "down" });
      timer = setTimeout(() => done({ kind: "down" }), TIMEOUT_MS);
      const sep = url.includes("?") ? "&" : "?";
      img.src = `${url}${sep}probe=${Date.now()}`;
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      if (timer) clearTimeout(timer);
      if (img) img.src = "";
    };
  }, [url]);

  return { ref, state };
}
