"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import type { Quest } from "@/data/types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import ProfileLinks from "../ProfileLinks";
import ProjectImage from "../ProjectImage";
import { categoryLabel } from "../showcase/meta";
import { DURATION, EASE_OUT } from "../motion/ease";

/**
 * Accordion rows. On mouse devices a small screenshot follows the cursor
 * while a collapsed row is hovered, so people can scan without opening rows.
 */
export default function MoreWorkList({ quests }: { quests: Quest[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Quest | null>(null);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const box = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 30 });
  const sy = useSpring(y, { stiffness: 300, damping: 30 });

  const onMove = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    // keep the 18rem preview inside the list so it can never widen the page
    x.set(Math.min(e.clientX - r.left + 24, r.width - 288));
    y.set(e.clientY - r.top - 90);
  };

  const preview = finePointer && hovered?.screenshot && open !== hovered.id ? hovered : null;

  return (
    <div ref={box} className="relative" onPointerMove={finePointer ? onMove : undefined}>
      <ul className="border-t border-border">
        {quests.map((q) => {
          const expanded = open === q.id;
          const panelId = `more-${q.id}`;
          return (
            <li key={q.id} className="border-b border-border">
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : q.id)}
                  onPointerEnter={() => setHovered(q)}
                  onPointerLeave={() => setHovered(null)}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-5 text-left md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto_auto]"
                >
                  <span className="truncate text-xl font-semibold tracking-[-0.02em] text-fg transition-transform duration-300 group-hover:translate-x-1 sm:text-2xl">
                    {q.title}
                  </span>
                  <span className="col-span-2 row-start-2 line-clamp-1 text-base text-fg-dim md:col-span-1 md:row-start-auto">
                    {q.summary}
                  </span>
                  <span className="hidden text-sm text-fg-mute md:block">{q.year}</span>
                  <span
                    aria-hidden
                    className={`col-start-2 row-start-1 grid h-11 w-11 place-items-center rounded-full border border-border transition-[transform,background-color] duration-300 md:col-start-auto md:row-start-auto ${
                      expanded ? "rotate-45 bg-accent-fill text-on-accent" : "text-fg group-hover:bg-panel-2"
                    }`}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                  </span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DURATION.ui + 0.06, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-6 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-10">
                      <div className="flex min-w-0 flex-col gap-4">
                        <p className="text-sm text-fg-mute">
                          {q.year} · {categoryLabel(q)}
                        </p>
                        <p className="max-w-prose text-base leading-relaxed text-fg-dim">{q.description}</p>
                        {q.highlights && (
                          <ul className="flex flex-col gap-2 text-base text-fg">
                            {q.highlights.map((h) => (
                              <li key={h} className="flex gap-3">
                                <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-fill" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <ul className="flex flex-wrap gap-2" aria-label="Stack">
                          {q.tags.slice(0, 6).map((t) => (
                            <li key={t} className="rounded-full bg-panel-2 px-3 py-1 text-sm text-fg-dim">
                              {t}
                            </li>
                          ))}
                        </ul>
                        <ProfileLinks quest={q} />
                      </div>
                      {q.screenshot && (
                        <div className="self-start overflow-hidden rounded-2xl border border-border">
                          <ProjectImage quest={q} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {preview && (
          <motion.div
            key={preview.id}
            aria-hidden
            style={{ x: sx, y: sy }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            className="pointer-events-none absolute left-0 top-0 z-10 w-72 overflow-hidden rounded-xl border border-border-strong shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img src={preview.screenshot} alt="" width={1280} height={800} className="aspect-[16/10] w-full object-cover object-top" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
