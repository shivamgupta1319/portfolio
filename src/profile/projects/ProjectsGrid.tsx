"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import type { Quest } from "@/data/types";
import ProjectCard from "@/components/ProjectCard";
import { track } from "@/analytics/track";
import { CHIPS, filterList, type Chip } from "./filters";

export default function ProjectsGrid({ quests }: { quests: Quest[] }) {
  const [chip, setChip] = useState<Chip>("all");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = filterList(quests, chip, deferred);
  const searchId = useId();

  useEffect(() => {
    if (chip !== "all") track("filter_change", { category: chip });
  }, [chip]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div
          role="group"
          aria-label="Filter projects by area"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {CHIPS.map((c) => {
            const active = chip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => setChip(c.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs transition ${
                  active
                    ? "border-accent bg-accent/15 text-accent-2"
                    : "border-border bg-panel text-fg-dim hover:border-border-strong hover:text-fg"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="relative md:ml-auto md:w-64">
          <label htmlFor={searchId} className="sr-only">
            Search projects
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full rounded-md border border-border bg-bg-2 px-3 py-2 text-sm text-fg placeholder:text-fg-mute focus:border-accent"
          />
        </div>
      </div>

      <p aria-live="polite" className="font-mono text-xs text-fg-mute">
        {results.length} of {quests.length} projects
      </p>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-dim">
          Nothing matches — try another word or clear the filter.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((q) => (
            <li key={q.id} className="flex">
              <div className="flex w-full">
                <ProjectCard quest={q} variant="grid" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
