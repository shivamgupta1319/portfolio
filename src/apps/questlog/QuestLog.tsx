"use client";

import { useState } from "react";
import { mainQuests, sideQuests } from "@/data/quests";
import QuestCard from "./QuestCard";

type Filter = "main" | "side" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "side", label: "Side" },
  { key: "all", label: "All" },
];

export default function QuestLog() {
  const [filter, setFilter] = useState<Filter>("main");
  const totalXp = mainQuests.reduce((s, q) => s + q.xpReward, 0);

  const showMain = filter === "main" || filter === "all";
  const showSide = filter === "side" || filter === "all";

  return (
    <div className="flex h-full flex-col bg-bg/30">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-amber">✦ QUEST LOG</span>
          <span className="font-mono text-[11px] text-fg-mute">
            {mainQuests.length} main · {sideQuests.length} side
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-green">
            {totalXp.toLocaleString()} XP available
          </span>
          <div className="flex rounded-lg border border-border bg-bg-2 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                  filter === f.key
                    ? "bg-accent/20 text-accent-2"
                    : "text-fg-dim hover:text-fg"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="os-scroll min-h-0 flex-1 overflow-auto p-4">
        {showMain && (
          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-mute">
              ◆ Main Quests
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {mainQuests.map((q) => (
                <QuestCard key={q.id} quest={q} variant="main" />
              ))}
            </div>
          </section>
        )}

        {showSide && (
          <section className={showMain ? "mt-6" : ""}>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-mute">
              ◇ Side Quests
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sideQuests.map((q) => (
                <QuestCard key={q.id} quest={q} variant="side" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
