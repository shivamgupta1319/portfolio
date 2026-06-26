"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import { stats } from "@/data/skills";
import { bio, traits } from "@/data/about";

function StatBar({ label, value }: { label: string; value: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 60);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
        <span className="text-fg-dim">{label}</span>
        <span className="text-green">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-cyan transition-[width] duration-1000 ease-out"
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

export default function CharacterSheet() {
  return (
    <div className="os-scroll h-full overflow-auto bg-bg/30 p-5">
      {/* identity */}
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-accent/40 bg-accent/10 font-mono text-xl font-bold text-accent-2">
          SG
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-fg">
              {profile.name}
            </h2>
            <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">
              LVL {profile.level}
            </span>
          </div>
          <p className="font-mono text-xs text-fg-dim">{profile.role}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-fg-mute">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
            available for opportunities · {profile.location}
          </p>
        </div>
      </div>

      {/* bio */}
      <div className="mt-5 space-y-2 text-sm leading-relaxed text-fg-dim">
        {bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* stats */}
      <div className="mt-6">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-mute">
          ◆ Attributes
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.map((s) => (
            <StatBar key={s.key} label={s.label} value={s.value} />
          ))}
        </div>
      </div>

      {/* class traits */}
      <div className="mt-6">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-mute">
          ◆ Class Abilities
        </h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {traits.map((t) => (
            <div
              key={t.title}
              className="rounded-xl border border-border bg-bg-2/60 p-3 transition hover:border-border-strong"
            >
              <div className="flex items-center gap-2">
                <span className="text-accent-2">{t.icon}</span>
                <span className="text-sm font-medium text-fg">{t.title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg-dim">
                {t.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
