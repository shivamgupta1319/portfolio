import type { CSSProperties } from "react";
import Link from "next/link";
import JsonLd from "@/seo/JsonLd";
import LegacyDeepLink from "@/site/LegacyDeepLink";
import ResumeButton from "@/site/ResumeButton";
import AppCover from "@/site/AppCover";
import { CountUp, Reveal, RiseText, Tilt } from "@/site/motion";
import { buttonClass } from "@/site/button";
import { apps, flagshipApps, liveApps, type App } from "@/data/apps";
import { experience } from "@/data/experience";
import { profile } from "@/data/profile";
import { skills } from "@/data/skills";
import { INFRA_FACTS } from "@/data/infra";

const work = experience.find((e) => e.kind === "work");

/** Whole years since a "Jun 2022"-style start. */
function yearsSince(start: string, now = new Date()): number {
  const [mon, year] = start.split(" ");
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mon ?? "");
  const from = new Date(Number(year), Math.max(0, m), 1);
  return Math.floor((now.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000));
}
const YEARS = work ? yearsSince(work.start) : 4;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const liveWord = WORDS[liveApps.length] ?? String(liveApps.length);
const containers = Number(INFRA_FACTS.find((f) => f.label === "Containers")?.value ?? 0);

const STACK = skills.filter((s) => s.tier <= 1).map((s) => s.label);

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function ArrowCircle() {
  return (
    <span
      aria-hidden
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border-strong text-fg transition-[background-color,color,transform] duration-300 group-hover:-rotate-45 group-hover:bg-fg group-hover:text-bg-2"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h12M11 5l5 5-5 5" />
      </svg>
    </span>
  );
}

function WorkCard({ app, large = false }: { app: App; large?: boolean }) {
  return (
    <article
      className={`group relative h-full rounded-[28px] border border-border bg-bg-2 p-3 transition-shadow duration-500 hover:shadow-[0_24px_60px_-28px_rgba(28,38,31,0.45)] sm:p-4 ${
        large ? "lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-10" : ""
      }`}
    >
      <div className="overflow-hidden rounded-[20px] border border-border bg-bg">
        <div className="transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.035]">
          <AppCover app={app} eager={large} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-2 pb-2 pt-5 lg:py-4">
        {app.host && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 font-mono text-[0.8125rem] text-accent-2">
            <span aria-hidden className="pulse-dot h-1.5 w-1.5 rounded-full bg-green text-green" />
            {app.host}
          </span>
        )}
        <h3 className={`wide font-semibold text-fg ${large ? "text-3xl sm:text-[2.6rem] sm:leading-[1.05]" : "text-2xl sm:text-3xl"}`}>
          <Link href={`/apps/${app.slug}/`} className="after:absolute after:inset-0 after:rounded-[28px] after:content-['']">
            {app.title}
          </Link>
        </h3>
        <p className="max-w-prose text-fg-dim">{app.story?.headline ?? app.summary}</p>
        {large && app.highlights && (
          <ul className="flex flex-wrap gap-2">
            {app.highlights.slice(0, 3).map((h) => (
              <li key={h} className="rounded-2xl border border-border px-3 py-1.5 text-[0.875rem] leading-snug text-fg-dim">
                {h}
              </li>
            ))}
          </ul>
        )}
        <span className="mt-1 flex items-center gap-3 text-[0.9375rem] font-semibold text-fg">
          <ArrowCircle />
          How it works
        </span>
      </div>
    </article>
  );
}

/** `/`: who I am first, then the work, then how to reach me. */
export default function Home() {
  const [first, ...rest] = flagshipApps;
  return (
    <>
      <JsonLd />
      <LegacyDeepLink />

      {/* ── hero ─────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14">
          <div className="min-w-0">
            <p className="fade-up inline-flex items-center gap-2.5 rounded-full border border-border bg-bg-2/70 py-1.5 pl-3 pr-4 text-[0.9375rem] font-medium text-fg" style={d(0)}>
              <span aria-hidden className="pulse-dot h-2 w-2 rounded-full bg-accent text-accent" />
              {profile.role} in {profile.location}
            </p>
            <h1 id="hero-title" className="wide mt-6 text-[clamp(3.6rem,13vw,8.4rem)] font-semibold leading-[0.9] text-fg">
              <span className="block">
                <RiseText text="Shivam" start={0.1} />
              </span>
              <span className="block text-accent">
                <RiseText text="Gupta" start={0.22} />
              </span>
            </h1>
            <p className="fade-up mt-7 max-w-xl text-[1.375rem] font-medium leading-snug tracking-tight text-fg sm:text-[1.6rem]" style={d(0.45)}>
              I design and ship software products. {liveWord} of them are live today.
            </p>
            <p className="fade-up mt-4 max-w-xl text-lg leading-relaxed text-fg-dim" style={d(0.55)}>
              {YEARS}+ years building real-time, AI and fintech systems
              {work ? ` at ${work.org}` : ""}, and a shelf of my own products running on a server I look after.
            </p>
            <div className="fade-up mt-8 flex flex-wrap gap-3" style={d(0.65)}>
              <Link href="/contact/" className={buttonClass("primary")}>
                Get in touch
              </Link>
              <a href="#work" className={buttonClass("ghost")}>
                See my work
              </a>
            </div>
          </div>

          <div className="fade-up relative mx-auto w-full max-w-[26rem] lg:max-w-none" style={d(0.3)}>
            <Tilt>
              <div className="relative overflow-hidden rounded-[32px] border border-border bg-bg-2 p-2.5 shadow-[0_30px_70px_-35px_rgba(28,38,31,0.55)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
                <img
                  src={profile.photo}
                  alt={`${profile.name}, portrait`}
                  width={1159}
                  height={1358}
                  fetchPriority="high"
                  className="aspect-[4/4.6] h-auto w-full rounded-[24px] object-cover object-[50%_30%]"
                />
              </div>
            </Tilt>
            <div className="float absolute -left-3 top-8 sm:-left-8" style={d(0)}>
              <p className="flex items-center gap-2 rounded-full border border-border bg-bg-2 px-4 py-2 text-[0.9375rem] font-semibold text-fg shadow-[0_12px_30px_-16px_rgba(28,38,31,0.5)]">
                <span aria-hidden className="pulse-dot h-2 w-2 rounded-full bg-green text-green" />
                {liveApps.length} apps live
              </p>
            </div>
            {work && (
              <div className="float absolute -right-2 bottom-8 max-w-[15rem] sm:-right-6" style={d(1.5)}>
                <div className="rounded-2xl border border-border bg-bg-2 px-4 py-3 shadow-[0_12px_30px_-16px_rgba(28,38,31,0.5)]">
                  <p className="text-[0.8125rem] text-fg-mute">Since {work.start}</p>
                  <p className="font-semibold leading-snug text-fg">{work.org}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── numbers ──────────────────────────────────────── */}
      <section aria-label="In numbers" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:mt-20">
        <dl className="grid grid-cols-2 overflow-hidden rounded-[28px] border border-border bg-bg-2 md:grid-cols-4">
          {[
            { n: YEARS, s: "+", label: "years shipping software" },
            { n: liveApps.length, s: "", label: "apps live on my domains" },
            { n: apps.length, s: "", label: "products and projects built" },
            { n: containers, s: "", label: "containers I keep running" },
          ].map((x, i) => (
            <Reveal key={x.label} delay={i * 0.08} className={`p-5 sm:p-7 ${i % 2 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
              <dt className="sr-only">{x.label}</dt>
              <dd className="wide text-5xl font-semibold text-fg sm:text-6xl">
                <CountUp to={x.n} suffix={x.s} />
              </dd>
              <dd className="mt-2 text-[0.9375rem] text-fg-dim">{x.label}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ── stack marquee ────────────────────────────────── */}
      <section aria-label="What I work with" className="marquee-wrap mt-14 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="sr-only">
          {STACK.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div aria-hidden className="marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {STACK.map((s) => (
                <span key={s} className="flex items-center whitespace-nowrap px-5 text-2xl font-medium tracking-tight text-fg-dim sm:text-3xl">
                  {s}
                  <span className="ml-10 h-2 w-2 rounded-full bg-accent" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── selected work ────────────────────────────────── */}
      <section id="work" aria-labelledby="work-title" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:mt-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-medium text-accent">Selected work</p>
            <h2 id="work-title" className="wide mt-2 max-w-[16ch] text-4xl font-semibold text-fg sm:text-5xl">
              Products I built, shipped and still run.
            </h2>
          </div>
          <Link href="/apps/" className="group inline-flex min-h-11 items-center gap-3 font-semibold text-fg">
            All {apps.length} apps
            <ArrowCircle />
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-5">
          <Reveal>
            <WorkCard app={first} large />
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2">
            {rest.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.1}>
                <WorkCard app={a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── about + work ─────────────────────────────────── */}
      <section aria-labelledby="about-title" className="mx-auto mt-24 grid max-w-6xl gap-5 px-4 sm:px-6 lg:mt-32 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Reveal className="rounded-[28px] border border-border bg-bg-2 p-6 sm:p-9">
          <p className="font-medium text-accent">About me</p>
          <h2 id="about-title" className="wide mt-2 text-3xl font-semibold text-fg sm:text-4xl">
            I build the measurement before the feature.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-fg-dim">
            The work I pick keeps landing where AI meets money: a code-intelligence engine checked against labelled
            answers, a model gateway serving my own products, and market research tools that count costs to the paisa
            and publish what didn&apos;t work.
          </p>
          <Link href="/about/" className="group mt-6 inline-flex min-h-11 items-center gap-3 font-semibold text-fg">
            <ArrowCircle />
            More about me
          </Link>
        </Reveal>
        {work && (
          <Reveal delay={0.1} className="flex flex-col rounded-[28px] bg-fg p-6 text-bg-2 sm:p-9">
            <p className="font-medium text-[#c9a6c2]">Where I work</p>
            <h2 className="wide mt-2 text-3xl font-semibold sm:text-4xl">{work.org}</h2>
            <p className="mt-1 text-[#c6cec7]">
              {work.role}, since {work.start}
            </p>
            <p className="mt-4 leading-relaxed text-[#dfe5de]">
              Core engineer on LACS / X-FACE, a disaster-response communication platform deployed on 25–30 field
              systems: WebRTC calls, on-device speech recognition, and offline-first sync that keeps every node working
              with no internet.
            </p>
            <Link href="/experience/" className="group mt-auto inline-flex min-h-11 items-center gap-3 pt-6 font-semibold">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 transition-[background-color,color,transform] duration-300 group-hover:-rotate-45 group-hover:bg-bg-2 group-hover:text-fg"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h12M11 5l5 5-5 5" />
                </svg>
              </span>
              Experience and skills
            </Link>
          </Reveal>
        )}
      </section>

      {/* ── contact ──────────────────────────────────────── */}
      <section aria-labelledby="contact-title" className="mx-auto mt-5 max-w-6xl px-4 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-accent-fill px-6 py-12 text-on-accent sm:px-12 sm:py-16">
          <h2 id="contact-title" className="wide max-w-[14ch] text-4xl font-semibold leading-[1.02] sm:text-6xl">
            Have something to build? Let&apos;s talk.
          </h2>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Hiring, or need a product built and run? Email me at
            <a href={`mailto:${profile.email}`} className="mt-1 block w-fit [overflow-wrap:anywhere] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              {profile.email}
            </a>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact/"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-accent-2 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Get in touch
            </Link>
            <ResumeButton variant="ghost" className="!border-white/40 !bg-transparent !text-white hover:!bg-white/10" />
          </div>
        </Reveal>
      </section>
    </>
  );
}

