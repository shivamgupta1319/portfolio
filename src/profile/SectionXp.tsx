"use client";

import { useEffect, useRef } from "react";
import { useXpStore, XP } from "@/hud/xpStore";

/** Invisible sentinel: awards XP the first time a section scrolls into view. */
export default function SectionXp({ id, label }: { id: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const award = useXpStore((s) => s.award);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          award(`section:${id}`, XP.section, `Explored ${label}`);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, label, award]);

  return <span ref={ref} aria-hidden className="block h-px w-px" />;
}
