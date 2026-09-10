import { experience } from "@/data/experience";
import type { ExperienceEntry } from "@/data/types";
import Section from "./Section";

const KIND: Record<ExperienceEntry["kind"], { label: string; sub: string; accent: string }> = {
  work: { label: "Work", sub: "mission", accent: "border-accent text-accent-2" },
  milestone: { label: "Milestone", sub: "achievement", accent: "border-amber text-amber" },
  education: { label: "Education", sub: "training", accent: "border-cyan text-cyan" },
};

export default function Experience() {
  return (
    <Section id="experience" title="Experience" sub="campaign log">
      <ol className="relative flex flex-col gap-8 border-l border-border pl-6">
        {experience.map((e) => {
          const k = KIND[e.kind];
          return (
            <li key={`${e.org}-${e.start}`} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-bg ${k.accent}`}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
                <span className={`rounded border px-1.5 py-0.5 ${k.accent} bg-panel`}>
                  {k.label}
                  <span aria-hidden className="text-fg-mute"> · {k.sub}</span>
                </span>
                <span className="text-fg-mute">
                  {e.start} — {e.end}
                </span>
                <span className="text-fg-mute">{e.location}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-fg">{e.role}</h3>
              <p className="text-sm text-fg-dim">{e.org}</p>
              {e.metrics && e.metrics.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Key numbers">
                  {e.metrics.map((m) => (
                    <li
                      key={m}
                      className="rounded-md border border-border bg-panel px-2 py-0.5 font-mono text-xs text-fg"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-fg-dim">
                {e.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden className="mt-0.5 text-fg-mute">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
