import type { Metadata } from "next";
import Link from "next/link";
import { bio, traits } from "@/data/about";
import { profile } from "@/data/profile";
import { liveApps } from "@/data/apps";
import ResumeButton from "@/site/ResumeButton";
import { buttonClass } from "@/site/button";

export const metadata: Metadata = {
  title: "About — Shivam Gupta",
  description: `Shivam Gupta is a full-stack engineer in ${profile.location} who builds products and runs them himself: ${liveApps.length} apps live on his own domains.`,
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
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="min-w-0">
          <h1 className="wide text-4xl font-bold leading-[1.05] text-fg sm:text-5xl">About</h1>
          <p className="mt-4 max-w-2xl text-xl leading-snug text-fg sm:text-2xl">{profile.tagline}</p>
          <div className="prose-site mt-6 max-w-2xl text-lg leading-relaxed text-fg-dim">
            {bio.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/apps/" className={buttonClass("primary")}>
              See what I&apos;ve built
            </Link>
            <ResumeButton variant="ghost" />
          </div>
        </div>
        {profile.photo && (
          <figure className="self-start lg:mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img
              src={profile.photo}
              alt={`${profile.name}, portrait`}
              width={1159}
              height={1358}
              className="aspect-[1159/1358] h-auto w-full max-w-xs rounded-[10px] border border-border object-cover lg:max-w-none"
            />
            <figcaption className="mt-2 text-[0.875rem] text-fg-mute">{profile.location}</figcaption>
          </figure>
        )}
      </div>

      <section aria-labelledby="what-i-do" className="mt-20">
        <h2 id="what-i-do" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
          What I work on
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {traits.map((t) => (
            <div key={t.title} className="border-t border-border pt-4">
              <dt className="wide-sm text-lg font-bold text-fg">{t.title}</dt>
              <dd className="mt-2 leading-relaxed text-fg-dim">{t.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="elsewhere" className="mt-20">
        <h2 id="elsewhere" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
          Elsewhere
        </h2>
        <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {ELSEWHERE.map((l) => (
            <li key={l.label} className="border-b border-border">
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer noopener me"
                className="flex min-h-14 items-center justify-between gap-4 text-fg hover:text-accent"
              >
                <span className="font-semibold">{l.label}</span>
                <span className="truncate font-mono text-[0.875rem] text-fg-mute">{l.value}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-fg-dim">
          This site also comes as a game-style desktop with a terminal, quest log and skill tree.{" "}
          <Link href="/desktop/" prefetch={false} className="font-semibold text-accent hover:underline">
            Open Desktop mode
          </Link>
        </p>
      </section>
    </div>
  );
}
