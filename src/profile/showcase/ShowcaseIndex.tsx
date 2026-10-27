"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Quest } from "@/data/types";
import ProjectDetail from "./ProjectDetail";
import { categoryLabel } from "./meta";
import { DURATION, EASE_OUT } from "../motion/ease";

/**
 * Desktop showcase: a vertical tab list of project names beside one large
 * case-study panel. Hover (mouse), click or arrow keys pick a project.
 */
export default function ShowcaseIndex({ quests }: { quests: Quest[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = quests[active];

  // Warm the image cache so switching tabs never shows a blank cover.
  useEffect(() => {
    for (const q of quests) {
      if (q.screenshot) new window.Image().src = q.screenshot;
    }
  }, [quests]);

  const focusTab = (i: number) => {
    const next = (i + quests.length) % quests.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusTab(active + 1),
      ArrowUp: () => focusTab(active - 1),
      Home: () => focusTab(0),
      End: () => focusTab(quests.length - 1),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14">
      <div role="tablist" aria-orientation="vertical" aria-label="Selected projects" onKeyDown={onKeyDown}>
        {quests.map((q, i) => {
          const selected = i === active;
          return (
            <button
              key={q.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`work-tab-${q.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="work-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              className="relative flex w-full items-center gap-4 border-b border-border py-4 text-left first:border-t"
            >
              {selected && (
                <motion.span
                  layoutId="work-indicator"
                  aria-hidden
                  className="absolute inset-y-3 left-0 w-1 rounded-full bg-accent-fill"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <motion.span
                animate={{ x: selected ? 20 : 0 }}
                transition={{ duration: DURATION.ui, ease: EASE_OUT }}
                className={`min-w-0 flex-1 truncate text-2xl font-semibold tracking-[-0.02em] transition-colors xl:text-[1.75rem] ${
                  selected ? "text-fg" : "text-fg-mute hover:text-fg-dim"
                }`}
              >
                {q.title}
              </motion.span>
              <span className={`shrink-0 text-sm transition-colors ${selected ? "text-fg-dim" : "text-fg-mute"}`}>
                {categoryLabel(q)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="work-panel"
        role="tabpanel"
        aria-labelledby={`work-tab-${current.id}`}
        className="sticky top-24 self-start"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
          >
            <ProjectDetail quest={current} eager={active === 0} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
