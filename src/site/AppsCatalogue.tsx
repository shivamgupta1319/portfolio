"use client";

import { useMemo, useState } from "react";
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
      <div role="group" aria-label="Filter by category" className="mt-8 flex flex-wrap gap-2">
        {chips.map((c) => {
          const on = c.key === cat;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setCat(c.key)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 text-[0.9375rem] transition-colors ${
                on
                  ? "border-accent-fill bg-accent-fill text-on-accent"
                  : "border-border text-fg-dim hover:border-border-strong hover:text-fg"
              }`}
            >
              {c.label}
              <span className={`font-mono text-[0.8125rem] tnum ${on ? "" : "text-fg-mute"}`}>{c.n}</span>
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
          <section key={g} aria-labelledby={`group-${g}`} className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border-strong pb-3">
              <h2 id={`group-${g}`} className="wide-sm text-2xl font-bold text-fg">
                {GROUP_LABELS[g]} <span className="font-mono text-base font-normal text-fg-mute tnum">{rows.length}</span>
              </h2>
              <p className="max-w-prose text-[0.9375rem] text-fg-mute">{GROUP_BLURBS[g]}</p>
            </div>
            <ul>
              {rows.map((it) => (
                <AppRow key={it.id} app={it} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
