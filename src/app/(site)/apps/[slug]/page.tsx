import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ACCESS_LABELS, apps, appBySlug, neighbours, oneLiner, type App } from "@/data/apps";
import { PROJECT_CATEGORY_LABELS } from "@/data/types";
import AppCover from "@/site/AppCover";
import Status from "@/site/Status";
import OutLink from "@/site/OutLink";
import AppJsonLd from "@/site/AppJsonLd";

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
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5 lg:grid-cols-1 lg:gap-0.5">
      <dt className="text-[0.8125rem] text-fg-mute">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] text-fg">{children}</dd>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="wide-sm scroll-mt-24 text-2xl font-bold text-fg">
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
      <nav aria-label="Breadcrumb" className="text-[0.9375rem]">
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
          <h1 className="wide text-4xl font-bold leading-[1.04] text-fg sm:text-5xl lg:text-6xl">{app.title}</h1>
          <p className="mt-4 max-w-3xl text-xl leading-snug text-fg sm:text-2xl">{s?.headline ?? oneLiner(app)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
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

        <dl className="self-start border-t border-border-strong lg:mt-2">
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
        <div className="mt-10 overflow-hidden rounded-[10px] border border-border bg-bg-2">
          <AppCover app={app} eager />
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
        <div className="min-w-0 max-w-3xl">
          {s ? (
            <>
              <p className="text-lg leading-relaxed text-fg-dim">{s.lede}</p>

              {s.numbers.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-6 sm:grid-cols-4">
                  {s.numbers.map(([n, label]) => (
                    <div key={label} className="flex min-w-0 flex-col-reverse">
                      <dt className="mt-1 text-[0.875rem] leading-snug text-fg-dim">{label}</dt>
                      <dd className="wide text-3xl font-bold text-fg tnum">{n}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {s.problem.length > 0 && (
                <section aria-labelledby="why" className="mt-12">
                  <H2 id="why">Why it exists</H2>
                  <div className="prose-site mt-4 leading-relaxed text-fg-dim">
                    {s.problem.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </section>
              )}

              {s.steps.length > 0 && (
                <section aria-labelledby="how" className="mt-12">
                  <H2 id="how">How it works</H2>
                  <ol className="mt-5 grid gap-0">
                    {s.steps.map(([title, body], i) => (
                      <li key={title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-t border-border py-4">
                        <span className="font-mono text-[0.9375rem] text-accent tnum">{i + 1}</span>
                        <div>
                          <h3 className="font-semibold text-fg">{title}</h3>
                          <p className="mt-1 leading-relaxed text-fg-dim">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {s.capabilities.length > 0 && (
                <section aria-labelledby="what" className="mt-12">
                  <H2 id="what">What it does well</H2>
                  <dl className="mt-5 grid gap-6 sm:grid-cols-2">
                    {s.capabilities.map(([title, body]) => (
                      <div key={title}>
                        <dt className="font-semibold text-fg">{title}</dt>
                        <dd className="mt-1 leading-relaxed text-fg-dim">{body}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {s.decisions.length > 0 && (
                <section aria-labelledby="decisions" className="mt-12">
                  <H2 id="decisions">Decisions I made</H2>
                  <dl className="mt-5 grid gap-5">
                    {s.decisions.map(([title, body]) => (
                      <div key={title} className="border-l-2 border-accent-fill pl-4">
                        <dt className="font-semibold text-fg">{title}</dt>
                        <dd className="mt-1 leading-relaxed text-fg-dim">{body}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {s.limits.length > 0 && (
                <section aria-labelledby="limits" className="mt-12">
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
              <section aria-labelledby="about-app">
                <H2 id="about-app">What it is</H2>
                <p className="mt-4 text-lg leading-relaxed text-fg-dim">{app.description}</p>
              </section>
              {app.highlights && app.highlights.length > 0 && (
                <section aria-labelledby="stands-out" className="mt-12">
                  <H2 id="stands-out">What stands out</H2>
                  <ul className="mt-5 grid gap-3">
                    {app.highlights.map((h) => (
                      <li key={h} className="border-l-2 border-accent-fill pl-4 leading-relaxed text-fg">
                        {h}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {app.tags.length > 0 && (
          <aside aria-labelledby="stack" className="self-start lg:sticky lg:top-24">
            <h2 id="stack" className="wide-sm text-lg font-bold text-fg">
              Built with
            </h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {app.tags.map((t) => (
                <li key={t} className="rounded-md border border-border px-2.5 py-1 text-[0.875rem] text-fg-dim">
                  {t}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <nav aria-label="More apps" className="mt-16 grid gap-3 border-t border-border-strong pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/apps/${prev.slug}/`} className="group flex min-h-11 flex-col rounded-md py-2">
            <span className="text-[0.8125rem] text-fg-mute">Previous</span>
            <span className="wide-sm text-lg font-bold text-fg group-hover:text-accent">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/apps/${next.slug}/`} className="group flex min-h-11 flex-col rounded-md py-2 sm:items-end sm:text-right">
            <span className="text-[0.8125rem] text-fg-mute">Next</span>
            <span className="wide-sm text-lg font-bold text-fg group-hover:text-accent">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
