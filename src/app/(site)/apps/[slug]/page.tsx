import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ACCESS_LABELS, apps, appBySlug, neighbours, oneLiner, type App } from "@/data/apps";
import { PROJECT_CATEGORY_LABELS } from "@/data/types";
import AppCover from "@/site/AppCover";
import Status from "@/site/Status";
import OutLink from "@/site/OutLink";
import AppJsonLd from "@/site/AppJsonLd";
import Arrow from "@/site/Arrow";
import { Reveal, RiseText } from "@/site/motion";
import type { CSSProperties } from "react";

export const dynamicParams = false;

export function generateStaticParams() {
  return apps.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const app = appBySlug(slug);
  if (!app) return {};
  const description = app.story?.headline ?? oneLiner(app);
  return {
    title: `${app.title} — Shivam Gupta`,
    description,
    alternates: { canonical: `/apps/${app.slug}/` },
    openGraph: { title: `${app.title}, built by Shivam Gupta`, description, url: `/apps/${app.slug}/` },
  };
}

function hostingLabel(app: App): string | undefined {
  switch (app.hosting) {
    case "self":
      return "My server, through a Cloudflare tunnel";
    case "vercel":
      return "Vercel";
    case "netlify":
      return "Netlify";
    case "external":
      return app.credit ? `${app.credit.replace(/^Team\s*·\s*/, "")} infrastructure` : "Its own domain";
    default:
      return undefined;
  }
}

function openLabel(app: App): string {
  if (!app.host) return "Open";
  if (app.access === "overview") return `Open ${app.host}`;
  if (app.access === "login") return `Open ${app.host} (sign-in)`;
  return `Open ${app.host}`;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-0 lg:grid-cols-1 lg:gap-0.5">
      <dt className="text-[0.8125rem] text-fg-mute">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] text-fg">{children}</dd>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="wide scroll-mt-24 text-3xl font-semibold text-fg">
      {children}
    </h2>
  );
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = appBySlug(slug);
  if (!app) notFound();
  const { prev, next } = neighbours(slug);
  const s = app.story;
  const hosting = hostingLabel(app);

  return (
    <article className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <AppJsonLd app={app} />
      <nav aria-label="Breadcrumb" className="fade-up text-[0.9375rem]">
        <Link href="/apps/" className="inline-flex min-h-11 items-center text-fg-dim hover:text-fg">
          Apps
        </Link>
        <span aria-hidden className="px-2 text-fg-mute">/</span>
        <span aria-current="page" className="text-fg-mute">
          {app.title}
        </span>
      </nav>

      <header className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
        <div className="min-w-0">
          <h1 className="wide text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[0.98] text-fg">
            <RiseText text={app.title} start={0.05} step={0.07} />
          </h1>
          <p className="fade-up mt-5 max-w-3xl text-xl leading-snug text-fg sm:text-2xl" style={{ "--d": "0.25s" } as CSSProperties}>
            {s?.headline ?? oneLiner(app)}
          </p>
          <div className="fade-up mt-7 flex flex-wrap items-center gap-3" style={{ "--d": "0.35s" } as CSSProperties}>
            {app.liveUrl && (
              <OutLink href={app.liveUrl} id={app.id} target="live" primary>
                {openLabel(app)}
              </OutLink>
            )}
            {app.npmUrl && (
              <OutLink href={app.npmUrl} id={app.id} target="npm">
                View on npm
              </OutLink>
            )}
            {app.repoUrl && (
              <OutLink href={app.repoUrl} id={app.id} target="source">
                Source code
              </OutLink>
            )}
            {!app.repoUrl && app.isPrivate && (
              <span className="text-[0.9375rem] text-fg-mute">Private repository; walkthrough on request</span>
            )}
          </div>
        </div>

        <dl className="fade-up self-start rounded-[24px] border border-border bg-bg-2 px-5 py-2 lg:mt-2" style={{ "--d": "0.3s" } as CSSProperties}>
          {app.liveUrl && (
            <Fact label="Status">
              <Status app={app} />
            </Fact>
          )}
          {app.access !== "none" && <Fact label="Access">{ACCESS_LABELS[app.access]}</Fact>}
          {hosting && <Fact label="Runs on">{hosting}</Fact>}
          {app.credit && <Fact label="Built as">{app.credit.replace(/^Team\s*·\s*/, "Team project, ")}</Fact>}
          {app.year && <Fact label="Year">{app.year}</Fact>}
          {app.category.length > 0 && (
            <Fact label="Area">{app.category.map((c) => PROJECT_CATEGORY_LABELS[c]).join(", ")}</Fact>
          )}
        </dl>
      </header>

      {app.screenshot && (
        <div className="fade-up mt-12 rounded-[32px] border border-border bg-bg-2 p-2.5 shadow-[0_30px_70px_-40px_rgba(28,38,31,0.5)] sm:p-3" style={{ "--d": "0.45s" } as CSSProperties}>
          <div className="overflow-hidden rounded-[24px] border border-border">
            <AppCover app={app} eager sizes="(min-width: 1152px) 1120px, 96vw" />
          </div>
        </div>
      )}

      <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
        <div className="min-w-0 max-w-3xl">
          {s ? (
            <>
              <Reveal>
                <p className="text-xl leading-relaxed text-fg">{s.lede}</p>
              </Reveal>

              {s.numbers.length > 0 && (
                <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {s.numbers.map(([n, label], i) => (
                    <Reveal key={label} delay={i * 0.07} className="h-full">
                      <div className="flex h-full min-w-0 flex-col-reverse justify-end rounded-[22px] border border-border bg-bg-2 p-4 sm:p-5">
                        <dt className="mt-1 text-[0.875rem] leading-snug text-fg-dim">{label}</dt>
                        <dd className="wide text-3xl font-semibold text-accent tnum">{n}</dd>
                      </div>
                    </Reveal>
                  ))}
                </dl>
              )}

              {s.problem.length > 0 && (
                <Reveal className="mt-16">
                <section aria-labelledby="why">
                  <H2 id="why">Why it exists</H2>
                  <div className="prose-site mt-4 leading-relaxed text-fg-dim">
                    {s.problem.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </section>
                </Reveal>
              )}

              {s.steps.length > 0 && (
                <section aria-labelledby="how" className="mt-16">
                  <Reveal>
                    <H2 id="how">How it works</H2>
                  </Reveal>
                  <ol className="mt-6 grid gap-3">
                    {s.steps.map(([title, body], i) => (
                      <Reveal as="li" key={title} delay={0.04 * i}>
                        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-[22px] border border-border bg-bg-2 p-4 sm:p-5">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft font-semibold text-accent-2 tnum">{i + 1}</span>
                          <div className="min-w-0 pt-2">
                            <h3 className="font-semibold text-fg">{title}</h3>
                            <p className="mt-1 leading-relaxed text-fg-dim">{body}</p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </ol>
                </section>
              )}

              {s.capabilities.length > 0 && (
                <section aria-labelledby="what" className="mt-16">
                  <Reveal>
                    <H2 id="what">What it does well</H2>
                  </Reveal>
                  <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                    {s.capabilities.map(([title, body], i) => (
                      <Reveal key={title} delay={(i % 2) * 0.07} className="h-full">
                        <div className="h-full rounded-[22px] border border-border bg-bg-2 p-5">
                          <dt className="font-semibold text-fg">{title}</dt>
                          <dd className="mt-1 leading-relaxed text-fg-dim">{body}</dd>
                        </div>
                      </Reveal>
                    ))}
                  </dl>
                </section>
              )}

              {s.decisions.length > 0 && (
                <section aria-labelledby="decisions" className="mt-16">
                  <Reveal>
                    <H2 id="decisions">Decisions I made</H2>
                  </Reveal>
                  <Reveal className="mt-6">
                    <dl className="grid gap-5 rounded-[28px] bg-fg p-6 text-bg-2 sm:p-8">
                      {s.decisions.map(([title, body]) => (
                        <div key={title} className="border-l-2 border-[#c9a6c2] pl-4">
                          <dt className="font-semibold">{title}</dt>
                          <dd className="mt-1 leading-relaxed text-[#dfe5de]">{body}</dd>
                        </div>
                      ))}
                    </dl>
                  </Reveal>
                </section>
              )}

              {s.limits.length > 0 && (
                <section aria-labelledby="limits" className="mt-16">
                  <H2 id="limits">What it doesn&apos;t do (yet)</H2>
                  <ul className="mt-4 grid list-disc gap-2 pl-5 leading-relaxed text-fg-dim marker:text-fg-mute">
                    {s.limits.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <>
              <Reveal>
                <section aria-labelledby="about-app">
                  <H2 id="about-app">What it is</H2>
                  <p className="mt-4 text-lg leading-relaxed text-fg-dim">{app.description}</p>
                </section>
              </Reveal>
              {app.highlights && app.highlights.length > 0 && (
                <section aria-labelledby="stands-out" className="mt-16">
                  <Reveal>
                    <H2 id="stands-out">What stands out</H2>
                  </Reveal>
                  <ul className="mt-6 grid gap-3">
                    {app.highlights.map((h, i) => (
                      <Reveal as="li" key={h} delay={i * 0.05}>
                        <p className="rounded-[22px] border border-border bg-bg-2 p-5 leading-relaxed text-fg">{h}</p>
                      </Reveal>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {app.tags.length > 0 && (
          <aside aria-labelledby="stack" className="self-start lg:sticky lg:top-24">
            <h2 id="stack" className="wide-sm text-lg font-semibold text-fg">
              Built with
            </h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {app.tags.map((t) => (
                <li key={t} className="rounded-full border border-border bg-bg-2 px-3 py-1 text-[0.875rem] text-fg-dim">
                  {t}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <nav aria-label="More apps" className="mt-20 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/apps/${prev.slug}/`}
            className="group flex min-h-24 items-center gap-4 rounded-[28px] border border-border bg-bg-2 p-5 transition-shadow duration-500 hover:shadow-[0_20px_50px_-30px_rgba(28,38,31,0.45)]"
          >
            <span className="rotate-180">
              <Arrow />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] text-fg-mute">Previous</span>
              <span className="wide-sm block truncate text-xl font-semibold text-fg">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/apps/${next.slug}/`}
            className="group flex min-h-24 items-center justify-between gap-4 rounded-[28px] bg-fg p-5 text-bg-2 transition-shadow duration-500 hover:shadow-[0_20px_50px_-30px_rgba(28,38,31,0.6)]"
          >
            <span className="min-w-0">
              <span className="block text-[0.8125rem] text-[#c6cec7]">Next</span>
              <span className="wide-sm block truncate text-xl font-semibold">{next.title}</span>
            </span>
            <Arrow dark />
          </Link>
        )}
      </nav>
    </article>
  );
}
