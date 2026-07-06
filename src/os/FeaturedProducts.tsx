"use client";

import { featuredProducts } from "@/data/featured";
import { useSfx } from "@/sound/useSfx";

/**
 * Top-right desktop widget showcasing the flagship products. Mirrors the
 * chrome look (border + translucent blur panel, mono type) and sits at z-[1]
 * like the desktop icon column so open windows (z-10) can still float over it.
 */
export default function FeaturedProducts() {
  const sfx = useSfx();
  return (
    <aside className="window-in absolute right-3 top-14 z-[1] hidden w-60 flex-col gap-2 md:flex">
      <div className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-mute">
        <span className="text-amber">★</span> Featured Products
      </div>
      {featuredProducts.map((p) => (
        <a
          key={p.id}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sfx("open")}
          className="group flex flex-col gap-1.5 rounded-lg border border-border bg-bg/60 px-3 py-2.5 backdrop-blur-md transition hover:border-border-strong hover:bg-panel"
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-bg-2 font-mono text-sm ${p.accent} transition group-hover:border-border-strong`}
            >
              {p.glyph}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-xs font-semibold text-fg">
                {p.name}
              </span>
              <span className={`block truncate font-mono text-[10px] ${p.accent}`}>
                {p.domain} ↗
              </span>
            </span>
          </div>
          <p className="text-[11px] leading-snug text-fg-dim">{p.tagline}</p>
        </a>
      ))}
    </aside>
  );
}
