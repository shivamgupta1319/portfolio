"use client";

import { motion } from "motion/react";
import type { Quest } from "@/data/types";
import { track } from "@/analytics/track";
import { EASE_OUT } from "./motion/ease";

/** Bare host for display, e.g. "apps.shopify.com/stocksafe-bundles" → "apps.shopify.com". */
function host(q: Quest): string {
  return q.liveLabel ?? new URL(q.liveUrl ?? "").host;
}

/** "Running in production": every showcased product with a public URL. */
export default function LiveBoard({ quests }: { quests: Quest[] }) {
  return (
    <motion.aside
      data-reveal
      aria-labelledby="live-title"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.35 }}
      className="min-w-0 rounded-3xl border border-border bg-bg-2 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="live-title" className="text-lg font-semibold text-fg">
          Running in production
        </h2>
        <span className="text-sm text-fg-mute">{quests.length} products</span>
      </div>
      <ul className="mt-4">
        {quests.map((q, i) => (
          <motion.li
            key={q.id}
            data-reveal
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.7 + i * 0.08 }}
            className="border-t border-border first:border-t-0"
          >
            <a
              href={q.liveUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track("project_click", { id: q.id, target: "live-board" })}
              className="group flex min-h-11 items-center gap-3 py-2"
            >
              <span aria-hidden className="relative flex h-2 w-2 shrink-0">
                <span
                  className="live-ping absolute inset-0 rounded-full bg-green"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
                <span className="relative h-2 w-2 rounded-full bg-green" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-fg transition-colors group-hover:text-accent">
                  {q.title}
                </span>
                <span className="block truncate text-sm text-fg-mute">{host(q)}</span>
              </span>
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-fg-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11 11 5M6 5h5v5" />
              </svg>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.aside>
  );
}
