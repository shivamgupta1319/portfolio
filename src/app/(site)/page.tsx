import Link from "next/link";
import JsonLd from "@/seo/JsonLd";
import LegacyDeepLink from "@/site/LegacyDeepLink";
import AppRow from "@/site/AppRow";
import ResumeButton from "@/site/ResumeButton";
import AppCover from "@/site/AppCover";
import { buttonClass } from "@/site/button";
import { apps, flagshipApps, HOME_BOARD_SIZE, liveApps, toListItem, type App } from "@/data/apps";
import { experience } from "@/data/experience";
import { profile } from "@/data/profile";
import { INFRA_FACTS } from "@/data/infra";

const board = liveApps.slice(0, HOME_BOARD_SIZE);
const work = experience.find((e) => e.kind === "work");

function Flagship({ app, large = false }: { app: App; large?: boolean }) {
  return (
    <article className={`group relative grid gap-5 ${large ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-10" : ""}`}>
      <div className="overflow-hidden rounded-[10px] border border-border bg-bg-2">
        <AppCover app={app} eager={large} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[0.8125rem] text-accent">{app.host}</p>
        <h3 className={`wide mt-1 font-bold text-fg ${large ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
          <Link href={`/apps/${app.slug}/`} className="after:absolute after:inset-0 after:content-['']">
            {app.title}
          </Link>
        </h3>
        <p className="mt-3 max-w-prose text-fg-dim">{app.story?.headline ?? app.summary}</p>
        {large && app.highlights && (
          <ul className="mt-4 grid gap-2 text-[0.9375rem] text-fg-dim">
            {app.highlights.slice(0, 3).map((h) => (
              <li key={h} className="border-l-2 border-accent-fill pl-3">
                {h}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[0.9375rem] font-semibold text-accent group-hover:underline">Read how it works</p>
      </div>
    </article>
  );
}

/** `/` — who I am, what's running right now, and where to go next. */
export default function Home() {
  const [first, ...rest] = flagshipApps;
  return (
    <>
      <JsonLd />
      <LegacyDeepLink />

      <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-12">
          <h1 id="hero-title" className="wide max-w-[13ch] text-[2.6rem] font-bold leading-[1.02] text-fg sm:text-6xl lg:text-[4.5rem]">
            I build products and run them myself.
          </h1>
          <div>
            <p className="text-lg leading-relaxed text-fg-dim">
              I&apos;m {profile.name}, a full-stack engineer in {profile.location.split(",")[0]}.{" "}
              {liveApps.length} of my apps are live on my own domains right now, served from a server I run.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/apps/" className={buttonClass("primary")}>
                See all {apps.length} apps
              </Link>
              <ResumeButton variant="ghost" />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="board-title" className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border-strong pb-3">
          <h2 id="board-title" className="wide-sm text-xl font-bold text-fg">
            Running now
          </h2>
          <p className="text-[0.9375rem] text-fg-mute">Each status is checked from your browser as it comes into view.</p>
        </div>
        <ul>
          {board.map((a) => (
            <AppRow key={a.id} app={toListItem(a)} />
          ))}
        </ul>
        <p className="mt-5">
          <Link href="/apps/" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
            All {liveApps.length} live apps, plus the systems and projects behind them
          </Link>
        </p>
      </section>

      <section aria-labelledby="flagship-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 id="flagship-title" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
          Where I&apos;d start
        </h2>
        <p className="mt-2 max-w-prose text-fg-dim">Three products that show how I work: measure first, then ship.</p>
        <div className="mt-8 grid gap-14">
          <Flagship app={first} large />
          <div className="grid gap-14 md:grid-cols-2 md:gap-8">
            {rest.map((a) => (
              <Flagship key={a.id} app={a} />
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Work and infrastructure" className="mx-auto mt-20 grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-8">
        {work && (
          <div className="border-t border-border-strong pt-5">
            <h2 className="wide-sm text-xl font-bold text-fg">At work</h2>
            <p className="mt-1 text-fg-mute">
              {work.role}, {work.org}, since {work.start}
            </p>
            <p className="mt-3 text-fg-dim">
              Core engineer on LACS / X-FACE, a disaster-response communication platform deployed on 25–30 field
              systems: WebRTC calls, on-device speech recognition, and offline-first sync that keeps every node
              working with no internet.
            </p>
            <Link href="/experience/" className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
              Experience and skills
            </Link>
          </div>
        )}
        <div className="border-t border-border-strong pt-5">
          <h2 className="wide-sm text-xl font-bold text-fg">How it runs</h2>
          <dl className="mt-3 grid grid-cols-3 gap-4">
            {INFRA_FACTS.slice(0, 3).map((f) => (
              <div key={f.label}>
                <dt className="text-[0.8125rem] text-fg-mute">{f.label}</dt>
                <dd className="wide mt-0.5 text-3xl font-bold text-fg tnum">{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-fg-dim">
            One server, a Docker Compose stack per app, and Cloudflare tunnels in front of everything. Public
            overview pages sit in front of the private apps.
          </p>
          <Link href="/infra/" className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
            How I run it
          </Link>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 rounded-[10px] border border-border bg-bg-2 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 id="contact-title" className="wide-sm text-2xl font-bold text-fg">
              Hiring, or have something to build?
            </h2>
            <p className="mt-2 text-fg-dim">
              Email{" "}
              <a href={`mailto:${profile.email}`} className="break-all font-semibold text-accent hover:underline">
                {profile.email}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/contact/" className={buttonClass("primary")}>
              Get in touch
            </Link>
            <ResumeButton variant="ghost" />
          </div>
        </div>
      </section>
    </>
  );
}
