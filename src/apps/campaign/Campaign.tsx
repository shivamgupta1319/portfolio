import { experience } from "@/data/experience";
import type { ExperienceEntry } from "@/data/types";

const KIND_STYLE: Record<
  ExperienceEntry["kind"],
  { dot: string; tag: string; label: string }
> = {
  work: { dot: "bg-accent border-accent", tag: "text-accent-2", label: "MISSION" },
  milestone: { dot: "bg-amber border-amber", tag: "text-amber", label: "ACHIEVEMENT" },
  education: { dot: "bg-cyan border-cyan", tag: "text-cyan", label: "TRAINING" },
};

export default function Campaign() {
  return (
    <div className="os-scroll h-full overflow-auto bg-bg/30 p-5">
      <h2 className="mb-5 font-mono text-sm text-rose">⚑ CAMPAIGN LOG</h2>

      <ol className="relative ml-3 border-l border-border">
        {experience.map((e, i) => {
          const k = KIND_STYLE[e.kind];
          return (
            <li key={i} className="relative mb-6 pl-6 last:mb-0">
              <span
                className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 ${k.dot} ${
                  e.highlight ? "ring-4 ring-accent/20" : ""
                }`}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="text-sm font-semibold text-fg">{e.role}</h3>
                <span className="font-mono text-[11px] text-fg-mute">
                  {e.start} — {e.end}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className={k.tag}>{k.label}</span>
                <span className="text-fg-dim">
                  {e.org} · {e.location}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {e.bullets.map((b, j) => (
                  <li
                    key={j}
                    className="flex gap-2 text-xs leading-relaxed text-fg-dim"
                  >
                    <span className="mt-1.5 text-fg-mute">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
