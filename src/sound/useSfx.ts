"use client";

import { useCallback } from "react";
import { useOsStore } from "@/os/store";

export type Sfx = "open" | "close" | "boot" | "levelup" | "click" | "hover";

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Blip {
  freq: number;
  to?: number;
  type?: OscillatorType;
  dur: number;
  gain?: number;
}

const PATCHES: Record<Sfx, Blip[]> = {
  open: [{ freq: 420, to: 720, type: "triangle", dur: 0.12, gain: 0.05 }],
  close: [{ freq: 520, to: 260, type: "triangle", dur: 0.1, gain: 0.05 }],
  click: [{ freq: 660, type: "square", dur: 0.04, gain: 0.025 }],
  hover: [{ freq: 880, type: "sine", dur: 0.03, gain: 0.015 }],
  boot: [
    { freq: 300, to: 600, type: "sawtooth", dur: 0.18, gain: 0.04 },
    { freq: 600, to: 900, type: "triangle", dur: 0.22, gain: 0.04 },
  ],
  levelup: [
    { freq: 523, type: "triangle", dur: 0.1, gain: 0.05 },
    { freq: 659, type: "triangle", dur: 0.1, gain: 0.05 },
    { freq: 784, type: "triangle", dur: 0.18, gain: 0.05 },
  ],
};

function playBlip(ac: AudioContext, b: Blip, startAt: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = b.type ?? "sine";
  osc.frequency.setValueAtTime(b.freq, startAt);
  if (b.to) osc.frequency.exponentialRampToValueAtTime(b.to, startAt + b.dur);
  const peak = b.gain ?? 0.04;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + b.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + b.dur + 0.02);
}

/** Synthesized SFX — no audio assets. Honors the OS sound toggle. */
export function useSfx() {
  return useCallback((name: Sfx) => {
    if (!useOsStore.getState().soundOn) return;
    const ac = audio();
    if (!ac) return;
    let t = ac.currentTime;
    for (const b of PATCHES[name]) {
      playBlip(ac, b, t);
      t += b.dur * 0.7;
    }
  }, []);
}
