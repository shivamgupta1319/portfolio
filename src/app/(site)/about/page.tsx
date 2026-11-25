import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { bio, traits } from "@/data/about";
import { profile } from "@/data/profile";
import { liveApps } from "@/data/apps";
import ResumeButton from "@/site/ResumeButton";
import { buttonClass } from "@/site/button";
import PageHeader from "@/site/PageHeader";
import Arrow from "@/site/Arrow";
import Photo from "@/site/Photo";
import { Reveal, Tilt } from "@/site/motion";

export const metadata: Metadata = {
  title: "About — Shivam Gupta",
  description: `Shivam Gupta is a software engineer in ${profile.location} who builds products and runs them himself: ${liveApps.length} apps live on his own domains.`,
  alternates: { canonical: "/about/" },
};

const ELSEWHERE = [
  { href: profile.github, label: "GitHub", value: profile.githubUser },
  { href: profile.linkedin, label: "LinkedIn", value: "in/myselfshivam" },
  ...(profile.npm ? [{ href: `https://www.npmjs.com/~${profile.npm}`, label: "npm", value: `~${profile.npm}` }] : []),
  ...(profile.devto ? [{ href: profile.devto, label: "dev.to", value: profile.githubUser }] : []),
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
        <div className="min-w-0">
          <PageHeader
            eyebrow="About me"
            title={`Hi, I'm ${profile.name.split(" ")[0]}.`}
            lede={<p className="text-fg">{profile.tagline}</p>}
          />
          <div className="prose-site fade-up mt-6 max-w-2xl text-lg leading-relaxed text-fg-dim" style={{ "--d": "0.4s" } as CSSProperties}>
            {bio.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ "--d": "0.5s" } as CSSProperties}>
            <Link href="/apps/" className={buttonClass("primary")}>
              See what I&apos;ve built
            </Link>
            <ResumeButton variant="ghost" />
          </div>
        </div>
        {profile.photo && (
          <figure className="fade-up mx-auto w-full max-w-sm self-start lg:max-w-none" style={{ "--d": "0.2s" } as CSSProperties}>
            <Tilt>
              <div className="rounded-[32px] border border-border bg-bg-2 p-2.5 shadow-[0_30px_70px_-35px_rgba(28,38,31,0.55)]">
                <Photo
                  priority
                  sizes="(min-width: 1024px) 384px, (min-width: 640px) 384px, 92vw"
                  className="aspect-[1159/1358] h-auto w-full rounded-[24px] object-cover"
                />
              </div>
            </Tilt>
            <figcaption className="mt-3 flex items-center gap-2 text-[0.9375rem] text-fg-dim">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {profile.location}
            </figcaption>
          </figure>
        )}
      </div>

      <section aria-labelledby="what-i-do" className="mt-24">
        <Reveal>
          <p className="font-medium text-accent">What I work on</p>
          <h2 id="what-i-do" className="wide mt-2 text-3xl font-semibold text-fg sm:text-4xl">
            Four areas I keep coming back to.
          </h2>
        </Reveal>
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          {traits.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.08} className="h-full">
              <div className="h-full rounded-[28px] border border-border bg-bg-2 p-6 transition-shadow duration-500 hover:shadow-[0_24px_60px_-30px_rgba(28,38,31,0.45)] sm:p-8">
                <dt className="wide-sm text-xl font-semibold text-fg">{t.title}</dt>
                <dd className="mt-3 leading-relaxed text-fg-dim">{t.detail}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      <section aria-labelledby="elsewhere" className="mt-24">
        <Reveal>
          <p className="font-medium text-accent">Elsewhere</p>
          <h2 id="elsewhere" className="wide mt-2 text-3xl font-semibold text-fg sm:text-4xl">
            Find me online.
          </h2>
        </Reveal>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {ELSEWHERE.map((l, i) => (
            <Reveal as="li" key={l.label} delay={i * 0.06}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer noopener me"
                className="group flex min-h-16 items-center justify-between gap-4 rounded-full border border-border bg-bg-2 py-2 pl-6 pr-2 text-fg transition-colors hover:border-border-strong"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{l.label}</span>
                  <span className="block truncate font-mono text-[0.8125rem] text-fg-mute">{l.value}</span>
                </span>
                <Arrow external />
              </a>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-6">
          <Link
            href="/desktop/"
            prefetch={false}
            className="group flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-fg p-6 text-bg-2 sm:p-8"
          >
            <span>
              <span className="wide-sm block text-2xl font-semibold">Open Desktop mode</span>
              <span className="mt-1 block text-[#c6cec7]">This site also comes as a game-style desktop with a terminal, quest log and skill tree.</span>
            </span>
            <Arrow dark />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
