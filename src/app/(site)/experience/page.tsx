import type { Metadata } from "next";
import Link from "next/link";
import { experience } from "@/data/experience";
import { skillsByGroup, SKILL_GROUP_LABELS, SKILL_GROUP_ORDER } from "@/data/skills";
import type { ExperienceEntry } from "@/data/types";
import ResumeButton from "@/site/ResumeButton";

export const metadata: Metadata = {
  title: "Experience — Shivam Gupta",
  description:
    "Four years as a full-stack engineer at Wisflux Tech Labs: real-time, AI and fintech systems, plus the stack I ship with.",
  alternates: { canonical: "/experience/" },
};

const KIND_LABEL: Record<ExperienceEntry["kind"], string> = {
  work: "Work",
  milestone: "Milestone",
  education: "Education",
};

function Entry({ e }: { e: ExperienceEntry }) {
  const when = e.start === e.end ? e.start : `${e.start} to ${e.end}`;
  return (
    <li className="grid gap-3 border-t border-border py-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
      <div className="text-[0.9375rem] text-fg-mute">
        <p className="font-mono text-fg-dim tnum">{when}</p>
        <p>{e.location}</p>
        <p className="mt-1">{KIND_LABEL[e.kind]}</p>
      </div>
      <div className="min-w-0 max-w-3xl">
        <h3 className="wide-sm text-2xl font-bold leading-tight text-fg">{e.role}</h3>
        <p className="mt-1 text-fg-dim">{e.org}</p>
        {e.metrics && e.metrics.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key numbers">
            {e.metrics.map((m) => (
              <li key={m} className="rounded-md border border-border-strong px-2.5 py-1 font-mono text-[0.8125rem] text-fg tnum">
                {m}
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-4 grid gap-3 leading-relaxed text-fg-dim">
          {e.bullets.map((b) => (
            <li key={b} className="border-l-2 border-border pl-4">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="wide text-4xl font-bold leading-[1.05] text-fg sm:text-5xl">Experience</h1>
          <p className="mt-3 max-w-2xl text-lg text-fg-dim">
            Four years at a product studio shipping real-time, AI and fintech systems, and my own products alongside.
          </p>
        </div>
        <ResumeButton />
      </div>

      <ol className="mt-10 border-b border-border">
        {experience.map((e) => (
          <Entry key={`${e.org}-${e.start}`} e={e} />
        ))}
      </ol>

      <section aria-labelledby="skills" className="mt-20">
        <h2 id="skills" className="wide text-3xl font-bold text-fg sm:text-4xl">
          Skills
        </h2>
        <p className="mt-3 max-w-2xl text-fg-dim">The stack I ship with, as listed on my résumé. Filled chips are the core.</p>
        <div className="mt-8 border-t border-border">
          {SKILL_GROUP_ORDER.map((g) => (
            <div key={g} className="grid gap-4 border-b border-border py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
              <h3 className="wide-sm text-lg font-bold text-fg">{SKILL_GROUP_LABELS[g]}</h3>
              <ul className="flex flex-wrap gap-2">
                {skillsByGroup[g].map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-md px-3 py-1.5 text-[0.9375rem] ${
                      n.tier === 0 ? "bg-fg font-semibold text-bg" : "border border-border-strong text-fg-dim"
                    }`}
                  >
                    {n.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-fg-dim">
          Prefer something more playful?{" "}
          <Link href="/desktop/?app=skilltree" prefetch={false} className="font-semibold text-accent hover:underline">
            Open the skill tree in Desktop mode
          </Link>
        </p>
      </section>
    </div>
  );
}
