import type { Metadata } from "next";
import Link from "next/link";
import { experience } from "@/data/experience";
import { skillsByGroup, SKILL_GROUP_LABELS, SKILL_GROUP_ORDER } from "@/data/skills";
import type { ExperienceEntry } from "@/data/types";
import ResumeButton from "@/site/ResumeButton";
import PageHeader from "@/site/PageHeader";
import Arrow from "@/site/Arrow";
import { Reveal, ScrollRail } from "@/site/motion";

export const metadata: Metadata = {
  title: "Experience — Shivam Gupta",
  description:
    "Four years as a software engineer at Wisflux Tech Labs: real-time, AI and fintech systems, plus the stack I ship with.",
  alternates: { canonical: "/experience/" },
};

const KIND_LABEL: Record<ExperienceEntry["kind"], string> = {
  work: "Work",
  milestone: "Milestone",
  education: "Education",
};

function Entry({ e }: { e: ExperienceEntry }) {
  const when = e.start === e.end ? e.start : `${e.start} to ${e.end}`;
  const isWork = e.kind === "work";
  return (
    <li className="relative pl-10 md:pl-14">
      <span
        aria-hidden
        className={`absolute left-[5px] top-8 h-3.5 w-3.5 rounded-full border-2 border-bg md:left-[9px] ${isWork ? "bg-accent" : "bg-fg-mute"}`}
      />
      <Reveal>
        <article className={`rounded-[28px] p-6 sm:p-8 ${isWork ? "bg-fg text-bg-2" : "border border-border bg-bg-2"}`}>
          <p className={`flex flex-wrap gap-x-3 text-[0.9375rem] ${isWork ? "text-[#c6cec7]" : "text-fg-mute"}`}>
            <span className="font-mono tnum">{when}</span>
            <span>{e.location}</span>
            <span className={isWork ? "text-[#c9a6c2]" : "text-accent"}>{KIND_LABEL[e.kind]}</span>
          </p>
          <h3 className="wide-sm mt-3 text-2xl font-semibold leading-tight sm:text-3xl">{e.role}</h3>
          <p className={`mt-1 ${isWork ? "text-[#dfe5de]" : "text-fg-dim"}`}>{e.org}</p>
          {e.metrics && e.metrics.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Key numbers">
              {e.metrics.map((m) => (
                <li
                  key={m}
                  className={`rounded-full px-3 py-1 font-mono text-[0.8125rem] tnum ${
                    isWork ? "bg-white/10 text-bg-2" : "bg-accent-soft text-accent-2"
                  }`}
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
          <ul className={`mt-5 grid max-w-3xl gap-3 leading-relaxed ${isWork ? "text-[#dfe5de]" : "text-fg-dim"}`}>
            {e.bullets.map((b) => (
              <li key={b} className={`border-l-2 pl-4 ${isWork ? "border-white/20" : "border-border"}`}>
                {b}
              </li>
            ))}
          </ul>
        </article>
      </Reveal>
    </li>
  );
}

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <PageHeader
        eyebrow="Experience"
        title="Four years of shipping."
        lede={<p>At a product studio building real-time, AI and fintech systems, and my own products alongside.</p>}
      >
        <ResumeButton />
      </PageHeader>

      <ScrollRail className="mt-14">
        <ol className="grid gap-5">
          {experience.map((e) => (
            <Entry key={`${e.org}-${e.start}`} e={e} />
          ))}
        </ol>
      </ScrollRail>

      <section aria-labelledby="skills" className="mt-24">
        <Reveal>
          <p className="font-medium text-accent">Skills</p>
          <h2 id="skills" className="wide mt-2 text-3xl font-semibold text-fg sm:text-4xl">
            The stack I ship with.
          </h2>
          <p className="mt-3 max-w-2xl text-fg-dim">As listed on my résumé. Filled chips are the core.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SKILL_GROUP_ORDER.map((g, i) => (
            <Reveal key={g} delay={(i % 2) * 0.08} className="h-full">
              <div className="h-full rounded-[28px] border border-border bg-bg-2 p-6 sm:p-8">
                <h3 className="wide-sm text-xl font-semibold text-fg">{SKILL_GROUP_LABELS[g]}</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {skillsByGroup[g].map((n) => (
                    <li
                      key={n.id}
                      className={`rounded-full px-3.5 py-1.5 text-[0.9375rem] ${
                        n.tier === 0 ? "bg-fg font-medium text-bg-2" : "border border-border-strong text-fg-dim"
                      }`}
                    >
                      {n.label}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-5">
          <Link
            href="/desktop/?app=skilltree"
            prefetch={false}
            className="group flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-border bg-bg-2 p-6 sm:p-8"
          >
            <span>
              <span className="wide-sm block text-xl font-semibold text-fg">Prefer something more playful?</span>
              <span className="mt-1 block text-fg-dim">Open the skill tree in Desktop mode.</span>
            </span>
            <Arrow />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
