"use client";

import { useEffect, useRef, useState } from "react";
import { useOsStore } from "@/os/store";
import { useXpStore } from "./xpStore";
import { useSfx } from "@/sound/useSfx";

function XpBar() {
  const level = useXpStore((s) => s.level);
  const xp = useXpStore((s) => s.xp);
  const max = useXpStore((s) => s.max);
  const lastGain = useXpStore((s) => s.lastGain);
  const pct = Math.min(100, Math.round((xp / max) * 100));

  return (
    <div className="relative flex items-center gap-2">
      <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">
        LVL {level} ⚡
      </span>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green to-cyan transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-fg-mute">
          {xp.toLocaleString()}/{max.toLocaleString()}
        </span>
      </div>
      {lastGain && (
        <span
          key={lastGain.id}
          className="xp-pop pointer-events-none absolute -bottom-4 right-0 font-mono text-[10px] text-green"
        >
          +{lastGain.amount} XP
        </span>
      )}
    </div>
  );
}

export default function Hud() {
  const windows = useOsStore((s) => s.windows);
  const award = useXpStore((s) => s.award);
  const leveledAt = useXpStore((s) => s.leveledAt);
  const level = useXpStore((s) => s.level);
  const sfx = useSfx();
  const seen = useRef(new Set<string>());
  const [levelUp, setLevelUp] = useState(false);
  const firstLevel = useRef(leveledAt);

  // Award XP the first time each app is discovered (opened).
  useEffect(() => {
    for (const w of windows) {
      if (!seen.current.has(w.appId)) {
        seen.current.add(w.appId);
        award(`app:${w.appId}`, 300, `Discovered ${w.appId}`);
      }
    }
  }, [windows, award]);

  // Celebrate level-ups.
  useEffect(() => {
    if (leveledAt === firstLevel.current) return;
    firstLevel.current = leveledAt;
    sfx("levelup");
    setLevelUp(true);
    const t = setTimeout(() => setLevelUp(false), 2200);
    return () => clearTimeout(t);
  }, [leveledAt, sfx]);

  return (
    <>
      <XpBar />
      {levelUp && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
          <div className="level-up-pop rounded-2xl border border-amber/50 bg-bg-2/90 px-10 py-6 text-center backdrop-blur-md">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
              level up
            </div>
            <div className="mt-1 text-4xl font-bold text-fg">{level}</div>
          </div>
        </div>
      )}
    </>
  );
}
