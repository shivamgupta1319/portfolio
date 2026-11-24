import type { Metadata } from "next";
import Link from "next/link";
import { ACCESS_LABELS, liveApps } from "@/data/apps";
import { INFRA_AS_OF, INFRA_FACTS, PRACTICES, REQUEST_PATH } from "@/data/infra";
import Status from "@/site/Status";
import PageHeader from "@/site/PageHeader";
import { CountUp, Reveal } from "@/site/motion";

/** "14 GB" → 14 and " GB", so the number can count up and the unit stays put. */
function split(v: string): [number, string] | null {
  const m = /^(\d+)(.*)$/.exec(v);
  return m ? [Number(m[1]), m[2] ?? ""] : null;
}

export const metadata: Metadata = {
  title: "How I run it — Shivam Gupta",
  description: `How ${liveApps.length} self-hosted apps run on one server behind Cloudflare tunnels: Docker Compose per app, public overview pages in front of private apps, and live status checks.`,
  alternates: { canonical: "/infra/" },
};

const asOf = new Date(`${INFRA_AS_OF}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function InfraPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <PageHeader
        eyebrow="How I run it"
        title="One server, everything on it."
        lede={
          <p>
            Every app on my domains runs on one server I set up and look after. No managed platform in between: Docker
            Compose, nginx and Cloudflare tunnels, and the habits that keep {liveApps.length} apps up at once.
          </p>
        }
      />

      <dl className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {INFRA_FACTS.map((f, i) => {
          const n = split(f.value);
          return (
            <Reveal key={f.label} delay={i * 0.06} className="h-full">
              <div className="flex h-full flex-col-reverse justify-end rounded-[22px] border border-border bg-bg-2 p-5">
                <dt className="mt-1 text-[0.875rem] text-fg-dim">{f.label}</dt>
                <dd className="wide text-4xl font-semibold text-fg">{n ? <CountUp to={n[0]} suffix={n[1]} /> : f.value}</dd>
              </div>
            </Reveal>
          );
        })}
      </dl>
      <p className="mt-3 text-[0.875rem] text-fg-mute">
        Read from the server on {asOf}. Addresses, ports and credentials are deliberately left out.
      </p>

      <section aria-labelledby="path" className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <h2 id="path" className="wide text-3xl font-semibold text-fg sm:text-4xl">
            The path of a request
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-fg-dim">
            When you open one of my apps, the request goes through Cloudflare and down a tunnel that the server
            itself opened, so no app needs a port opened to the internet. nginx then decides, route by route,
            whether you see a public page, a sign-in or the app.
          </p>
        </div>
        <ol className="relative grid gap-3" aria-label="Request path, outermost first">
          {REQUEST_PATH.map((step, i) => (
            <Reveal as="li" key={step.name} delay={i * 0.12} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4">
              {/* connector between layers */}
              {i < REQUEST_PATH.length - 1 && (
                <span aria-hidden className="absolute left-[0.5625rem] top-6 h-[calc(100%-0.25rem)] w-0.5 bg-border-strong" />
              )}
              <span
                aria-hidden
                className={`relative mt-1.5 h-5 w-5 rounded-full border-2 ${
                  i === 2 ? "border-accent-fill bg-accent-fill" : "border-border-strong bg-bg"
                }`}
              />
              <div className={`rounded-[20px] px-5 py-4 ${i === 2 ? "bg-fg text-bg-2" : "border border-border bg-bg-2"}`}>
                <p className="font-semibold">{step.name}</p>
                <p className={`mt-0.5 text-[0.9375rem] leading-snug ${i === 2 ? "text-[#dfe5de]" : "text-fg-dim"}`}>{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section aria-labelledby="practices" className="mt-20">
        <Reveal>
          <h2 id="practices" className="wide text-3xl font-semibold text-fg sm:text-4xl">
            Habits that keep it running
          </h2>
        </Reveal>
        <dl className="mt-8 grid gap-3 md:grid-cols-2">
          {PRACTICES.map((p, i) => (
            <Reveal key={p.title} delay={(i % 2) * 0.08} className="h-full">
              <div className="h-full rounded-[28px] border border-border bg-bg-2 p-6 sm:p-8">
                <dt className="wide-sm text-xl font-semibold text-fg">{p.title}</dt>
                <dd className="mt-2 leading-relaxed text-fg-dim">{p.body}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      <section aria-labelledby="running" className="mt-20">
        <h2 id="running" className="wide text-3xl font-semibold text-fg sm:text-4xl">
          What&apos;s on it
        </h2>
        <p className="mt-3 max-w-prose text-fg-dim">Every live app on the server, checked from your browser.</p>
        <div className="relative mt-6 overflow-x-auto rounded-[28px] border border-border bg-bg-2">
          <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
            <thead className="bg-panel-2 text-fg-mute">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">App</th>
                <th scope="col" className="px-4 py-3 font-semibold">Domain</th>
                <th scope="col" className="px-4 py-3 font-semibold">Access</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {liveApps.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <th scope="row" className="px-4 py-2.5 font-semibold text-fg">
                    <Link href={`/apps/${a.slug}/`} className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                      {a.title}
                    </Link>
                  </th>
                  <td className="px-4 py-2.5 font-mono text-[0.8125rem] text-accent">{a.host}</td>
                  <td className="px-4 py-2.5 text-fg-dim">{ACCESS_LABELS[a.access]}</td>
                  <td className="px-4 py-2.5">
                    <Status app={a} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
