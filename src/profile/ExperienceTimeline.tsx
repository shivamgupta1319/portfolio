"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import type { ExperienceEntry } from "@/data/types";
import Reveal from "./motion/Reveal";
import { DURATION, EASE_OUT } from "./motion/ease";

const KIND_LABEL: Record<ExperienceEntry["kind"], string> = {
  work: "Work",
  milestone: "Milestone",
  education: "Education",
};

/** How many bullets show before "Show more". */
const VISIBLE = 3;

function Entry({ e }: { e: ExperienceEntry }) {
  const [more, setMore] = useState(false);
  const head = e.bullets.slice(0, VISIBLE);
  const rest = e.bullets.slice(VISIBLE);
  const listId = `exp-more-${e.org.replace(/\W+/g, "-")}-${e.start.replace(/\W+/g, "")}`;
  const when = e.start === e.end ? e.start : `${e.start} – ${e.end}`;

  return (
    <li className="relative grid gap-3 pl-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 md:pl-0">
      <span
        aria-hidden
        className={`absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-bg md:left-[13.5rem] ${
          e.highlight ? "bg-accent-fill" : "bg-fg-mute"
        }`}
      />
      <Reveal y={12} className="text-sm text-fg-mute md:pt-0.5 md:text-right">
        <p className="text-base text-fg-dim">{when}</p>
        <p>{e.location}</p>
      </Reveal>
      <Reveal y={16} delay={0.05} className="min-w-0 md:pl-10">
        <p className="text-sm text-fg-mute">{KIND_LABEL[e.kind]}</p>
        <h3 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg">{e.role}</h3>
        <p className="mt-1 text-base text-fg-dim">{e.org}</p>
        {e.metrics && e.metrics.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key numbers">
            {e.metrics.map((m) => (
              <li key={m} className="rounded-full border border-border-strong px-3 py-1 text-sm text-fg">
                {m}
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-4 flex max-w-prose flex-col gap-3 text-base leading-relaxed text-fg-dim">
          {head.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {rest.length > 0 && (
          <>
            <AnimatePresence initial={false}>
              {more && (
                <motion.ul
                  id={listId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: DURATION.ui + 0.06, ease: EASE_OUT }}
                  className="flex max-w-prose flex-col gap-3 overflow-hidden text-base leading-relaxed text-fg-dim"
                >
                  {rest.map((b, i) => (
                    <li key={b} className={i === 0 ? "pt-3" : ""}>
                      {b}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            <button
              type="button"
              aria-expanded={more}
              aria-controls={listId}
              onClick={() => setMore((v) => !v)}
              className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-accent underline-offset-4 hover:underline"
            >
              {more ? "Show less" : `Show ${rest.length} more`}
            </button>
          </>
        )}
      </Reveal>
    </li>
  );
}

/** Vertical timeline; the accent line fills in as the section scrolls past. */
export default function ExperienceTimeline({ entries }: { entries: ExperienceEntry[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <div className="relative">
      <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-border md:left-[13.5rem]" />
      <motion.span
        aria-hidden
        style={{ scaleY }}
        className="absolute bottom-2 left-0 top-2 w-px origin-top bg-accent-fill md:left-[13.5rem]"
      />
      <ol ref={ref} className="flex flex-col gap-14">
        {entries.map((e) => (
          <Entry key={`${e.org}-${e.start}`} e={e} />
        ))}
      </ol>
    </div>
  );
}
