"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { GROUP_BLURBS, GROUP_LABELS, type AppGroup, type AppListItem } from "@/data/appMeta";
import { PROJECT_CATEGORIES, PROJECT_CATEGORY_LABELS, type ProjectCategory } from "@/data/types";
import AppRow from "./AppRow";

const GROUP_ORDER: AppGroup[] = ["live", "system", "project"];

/** The /apps list: three groups in order, filterable by category. */
export default function AppsCatalogue({ items }: { items: AppListItem[] }) {
  const [cat, setCat] = useState<ProjectCategory | "all">("all");

  const counts = useMemo(() => {
    const c: Partial<Record<ProjectCategory, number>> = {};
    for (const it of items) for (const k of it.category) c[k] = (c[k] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = cat === "all" ? items : items.filter((it) => it.category.includes(cat));

  const chips: { key: ProjectCategory | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: items.length },
    ...PROJECT_CATEGORIES.filter((k) => counts[k]).map((k) => ({
      key: k,
      label: PROJECT_CATEGORY_LABELS[k],
      n: counts[k] ?? 0,
    })),
  ];

  return (
    <>
      <div role="group" aria-label="Filter by category" className="fade-up mt-10 flex flex-wrap gap-2" style={{ "--d": "0.45s" } as CSSProperties}>
        {chips.map((c) => {
          const on = c.key === cat;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setCat(c.key)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium transition-[background-color,color,border-color,transform] duration-300 active:scale-95 ${
                on
                  ? "border-fg bg-fg text-bg-2"
                  : "border-border bg-bg-2/60 text-fg-dim hover:border-border-strong hover:text-fg"
              }`}
            >
              {c.label}
              <span className={`font-mono text-[0.8125rem] tnum ${on ? "text-bg-2/70" : "text-fg-mute"}`}>{c.n}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {shown.length} apps shown
      </p>

      {GROUP_ORDER.map((g) => {
        const rows = shown.filter((it) => it.group === g);
        if (!rows.length) return null;
        return (
          <section key={`${g}-${cat}`} aria-labelledby={`group-${g}`} className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <h2 id={`group-${g}`} className="wide text-3xl font-semibold text-fg sm:text-4xl">
                {GROUP_LABELS[g]} <span className="font-mono text-base font-normal tracking-normal text-fg-mute tnum">{rows.length}</span>
              </h2>
              <p className="max-w-prose text-[0.9375rem] text-fg-mute">{GROUP_BLURBS[g]}</p>
            </div>
            <ul className="mt-5 overflow-hidden rounded-[28px] border border-border bg-bg-2">
              {rows.map((it, i) => (
                <AppRow key={it.id} app={it} index={i} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
