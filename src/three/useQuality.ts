"use client";

import { useState } from "react";

export interface Quality {
  enabled: boolean;
  count: number;
  dpr: [number, number];
}

const OFF: Quality = { enabled: false, count: 0, dpr: [1, 1] };

function compute(): Quality {
  if (typeof window === "undefined") return OFF;
  const fine = window.matchMedia?.("(pointer: fine)").matches;
  const reduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const wide = window.innerWidth >= 768;
  if (!fine || reduced || !wide) return OFF;

  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const high = cores >= 8 && mem >= 8;
  return {
    enabled: true,
    count: high ? 2600 : 1300,
    dpr: [1, high ? 1.75 : 1.5],
  };
}

/**
 * Particle budget by device capability; off for touch / reduced-motion / small.
 * Computed once in a lazy initializer — this hook only runs in the client-only
 * (ssr:false) BackgroundScene, so window is always defined here.
 */
export function useQuality(): Quality {
  const [q] = useState<Quality>(compute);
  return q;
}
