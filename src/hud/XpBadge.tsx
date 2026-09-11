"use client";

import { useXpStore } from "./xpStore";

/**
 * Level pill + XP bar. Shared by the profile nav, the desktop top bar and the
 * mobile HUD. `compact` hides the bar (level pill only).
 */
export default function XpBadge({ compact = false }: { compact?: boolean }) {
  const level = useXpStore((s) => s.level);
  const xp = useXpStore((s) => s.xp);
  const max = useXpStore((s) => s.max);
  const lastGain = useXpStore((s) => s.lastGain);
  const pct = Math.min(100, Math.round((xp / max) * 100));

  return (
    <div
      className="relative flex items-center gap-2"
      title={`Level ${level} · ${xp.toLocaleString()} / ${max.toLocaleString()} XP`}
    >
      <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-xs text-amber">
        LVL {level} ⚡
      </span>
      {!compact && (
        <div className="hidden items-center gap-2 sm:flex">
          <div
            role="progressbar"
            aria-label="Experience toward next level"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={xp}
            className="h-1.5 w-28 overflow-hidden rounded-full bg-panel-2"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-green to-cyan transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-fg-mute">
            {xp.toLocaleString()}/{max.toLocaleString()}
          </span>
        </div>
      )}
      {lastGain && (
        <span
          key={lastGain.id}
          aria-hidden
          className="xp-pop pointer-events-none absolute -bottom-4 right-0 font-mono text-xs text-green"
        >
          +{lastGain.amount} XP
        </span>
      )}
    </div>
  );
}
