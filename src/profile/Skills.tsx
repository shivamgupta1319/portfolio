import Link from "next/link";
import { skillsByGroup, SKILL_GROUP_LABELS, SKILL_GROUP_ORDER, stats } from "@/data/skills";
import Section from "./Section";

export default function Skills() {
  return (
    <Section
      id="skills"
      title="Skills"
      sub="skill tree"
      intro="The stack I ship with. Root skills are bold; branches are what I've built on top of them."
    >
      <ul className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Strengths">
        {stats.map((s) => (
          <li key={s.key} className="rounded-xl border border-border bg-bg-2/60 p-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg">{s.label}</span>
              <span className="text-fg-mute">{s.value}</span>
            </div>
            <div
              role="meter"
              aria-label={s.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={s.value}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-cyan"
                style={{ width: `${s.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SKILL_GROUP_ORDER.map((g) => (
          <div key={g} className="rounded-xl border border-border bg-bg-2/60 p-4">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-fg-mute">
              {SKILL_GROUP_LABELS[g]}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {skillsByGroup[g].map((n) => (
                <li
                  key={n.id}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    n.tier === 0
                      ? "border-border-strong bg-panel-2 font-semibold text-fg"
                      : "border-border bg-panel text-fg-dim"
                  }`}
                >
                  {n.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 font-mono text-xs text-fg-mute">
        Prefer the game version?{" "}
        <Link href="/desktop?app=skilltree" prefetch={false} className="text-accent-2 hover:underline">
          View as a skill tree in desktop mode <span aria-hidden>▸</span>
        </Link>
      </p>
    </Section>
  );
}
