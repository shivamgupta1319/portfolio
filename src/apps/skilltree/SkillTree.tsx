"use client";

import { useMemo } from "react";
import { skills, SKILL_GROUP_LABELS } from "@/data/skills";
import type { SkillGroup, SkillNode } from "@/data/types";

const LABEL_W = 104;
const TIER_W = 188;
const NODE_W = 150;
const NODE_H = 34;
const ROW_GAP = 14;
const BAND_GAP = 26;
const TOP_PAD = 8;

const GROUP_ORDER: SkillGroup[] = [
  "frontend",
  "backend",
  "data",
  "infra",
  "specialty",
];

const GROUP_COLOR: Record<SkillGroup, { line: string; node: string; text: string }> = {
  frontend: { line: "#22d3ee", node: "border-cyan/40", text: "text-cyan" },
  backend: { line: "#6366f1", node: "border-accent/40", text: "text-accent-2" },
  data: { line: "#34d399", node: "border-green/40", text: "text-green" },
  infra: { line: "#fbbf24", node: "border-amber/40", text: "text-amber" },
  specialty: { line: "#fb7185", node: "border-rose/40", text: "text-rose" },
};

interface Placed {
  node: SkillNode;
  x: number;
  y: number;
}

export default function SkillTree() {
  const { placed, byId, bands, width, height } = useMemo(() => {
    const placed: Placed[] = [];
    const byId = new Map<string, Placed>();
    const bands: { group: SkillGroup; y: number; h: number }[] = [];
    let cursorY = TOP_PAD;
    let maxTier = 0;

    for (const group of GROUP_ORDER) {
      const nodes = skills.filter((n) => n.group === group);
      const tiers = new Map<number, SkillNode[]>();
      for (const n of nodes) {
        maxTier = Math.max(maxTier, n.tier);
        const arr = tiers.get(n.tier) ?? [];
        arr.push(n);
        tiers.set(n.tier, arr);
      }
      const rows = Math.max(...[...tiers.values()].map((a) => a.length));
      const bandH = rows * NODE_H + (rows - 1) * ROW_GAP;
      bands.push({ group, y: cursorY, h: bandH });

      for (const [tier, arr] of tiers) {
        arr.forEach((node, k) => {
          const x = LABEL_W + tier * TIER_W;
          const y = cursorY + k * (NODE_H + ROW_GAP);
          const p = { node, x, y };
          placed.push(p);
          byId.set(node.id, p);
        });
      }
      cursorY += bandH + BAND_GAP;
    }

    return {
      placed,
      byId,
      bands,
      width: LABEL_W + (maxTier + 1) * TIER_W,
      height: cursorY,
    };
  }, []);

  return (
    <div className="os-scroll h-full overflow-auto bg-bg/30 p-4">
      <h2 className="mb-3 font-mono text-sm text-accent-2">⌘ SKILL TREE</h2>
      <div className="relative" style={{ width, height }}>
        {/* connector lines */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
        >
          {placed.flatMap((p) =>
            p.node.deps.map((depId) => {
              const dep = byId.get(depId);
              if (!dep) return null;
              const x1 = dep.x + NODE_W;
              const y1 = dep.y + NODE_H / 2;
              const x2 = p.x;
              const y2 = p.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${depId}-${p.node.id}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={GROUP_COLOR[p.node.group].line}
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                />
              );
            }),
          )}
        </svg>

        {/* band labels */}
        {bands.map((b) => (
          <div
            key={b.group}
            className="absolute font-mono text-[10px] uppercase tracking-wider text-fg-mute"
            style={{ left: 0, top: b.y + b.h / 2 - 8, width: LABEL_W - 12 }}
          >
            {SKILL_GROUP_LABELS[b.group]}
          </div>
        ))}

        {/* nodes */}
        {placed.map((p) => {
          const c = GROUP_COLOR[p.node.group];
          return (
            <div
              key={p.node.id}
              className={`absolute flex items-center gap-2 rounded-lg border bg-bg-2 px-3 text-xs text-fg shadow-sm transition hover:bg-panel-2 ${c.node}`}
              style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
              title={`${p.node.label} — unlocked`}
            >
              <span className={`text-[10px] ${c.text}`}>◆</span>
              <span className="truncate">{p.node.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
