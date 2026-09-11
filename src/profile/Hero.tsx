import Image from "next/image";
import { profile, proofPoints } from "@/data/profile";
import ResumeLink from "./ResumeLink";

export default function Hero() {
  return (
    <div id="top" className="grid items-center gap-8 py-12 sm:py-20 lg:grid-cols-[1fr_auto] lg:gap-10">
      <div className="flex flex-col gap-5">
        <span aria-hidden className="game-sub">
          player profile · lvl {profile.level}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {profile.name}
        </h1>
        <p className="font-mono text-lg text-accent-2 sm:text-xl">{profile.headline}</p>
        <p className="max-w-xl text-base leading-relaxed text-fg-dim sm:text-lg">
          {profile.tagline}
        </p>

        <ul className="flex flex-wrap gap-2" aria-label="Highlights">
          {proofPoints.slice(0, 3).map((p) => (
            <li
              key={p}
              className="rounded-md border border-border bg-panel px-2.5 py-1 font-mono text-xs text-fg"
            >
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <a
            href="#featured"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm font-medium text-fg transition hover:border-border-strong"
          >
            View projects <span aria-hidden>↓</span>
          </a>
          <ResumeLink />
        </div>

        <p className="font-mono text-xs text-fg-mute">
          <span aria-hidden>◉</span> {profile.location} · open to remote and relocation
        </p>
      </div>

      {profile.photo && (
        <div className="order-first justify-self-start lg:order-none lg:justify-self-end">
          <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border bg-bg-2 shadow-[0_24px_80px_-30px_rgba(99,102,241,0.6)] sm:h-52 sm:w-52">
            <Image
              src={profile.photo}
              alt={`${profile.name}, ${profile.role}`}
              fill
              sizes="(min-width: 640px) 208px, 160px"
              priority
              className="object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
