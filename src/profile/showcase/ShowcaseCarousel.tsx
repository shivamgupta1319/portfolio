"use client";

import { useRef, useState } from "react";
import type { Quest } from "@/data/types";
import ProjectDetail from "./ProjectDetail";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
}

/** Phones and tablets: a swipeable scroll-snap row. It scrolls inside itself, never the page. */
export default function ShowcaseCarousel({ quests }: { quests: Quest[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const step = () => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 16 : 0; // card width + gap-4
  };

  const onScroll = () => {
    const el = track.current;
    const w = step();
    if (!el || !w) return;
    setIndex(Math.min(quests.length - 1, Math.round(el.scrollLeft / w)));
  };

  const go = (i: number) => {
    const next = Math.max(0, Math.min(quests.length - 1, i));
    track.current?.scrollTo({ left: next * step(), behavior: "smooth" });
  };

  return (
    <div>
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label="Selected projects"
        className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {quests.map((q, i) => (
          <li
            key={q.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${quests.length}: ${q.title}`}
            className="w-[86%] shrink-0 snap-start sm:w-[62%]"
          >
            <ProjectDetail quest={q} eager={i === 0} compact />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-fg-dim" aria-live="polite">
          <span className="text-fg">{index + 1}</span> of {quests.length}
          <span className="sr-only">: {quests[index].title}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous project"
            className="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-fg transition-opacity disabled:opacity-35"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === quests.length - 1}
            aria-label="Next project"
            className="grid h-11 w-11 place-items-center rounded-full border border-border-strong text-fg transition-opacity disabled:opacity-35"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>
    </div>
  );
}
