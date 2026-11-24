import type { Metadata } from "next";
import Link from "next/link";
import { ACCESS_LABELS, liveApps } from "@/data/apps";
import { INFRA_AS_OF, INFRA_FACTS, PRACTICES, REQUEST_PATH } from "@/data/infra";
import Status from "@/site/Status";

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
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
      <h1 className="wide max-w-[16ch] text-4xl font-bold leading-[1.05] text-fg sm:text-5xl">How I run it</h1>
      <p className="mt-3 max-w-2xl text-lg text-fg-dim">
        Every app on my domains runs on one server I set up and look after. No managed platform in between: Docker
        Compose, nginx and Cloudflare tunnels, and the habits that keep {liveApps.length} apps up at once.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-6">
        {INFRA_FACTS.map((f) => (
          <div key={f.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-[0.875rem] text-fg-dim">{f.label}</dt>
            <dd className="wide text-3xl font-bold text-fg tnum">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.875rem] text-fg-mute">
        Read from the server on {asOf}. Addresses, ports and credentials are deliberately left out.
      </p>

      <section aria-labelledby="path" className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <h2 id="path" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
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
            <li key={step.name} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4">
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
              <div className="rounded-md border border-border bg-bg-2 px-4 py-3">
                <p className="font-semibold text-fg">{step.name}</p>
                <p className="mt-0.5 text-[0.9375rem] leading-snug text-fg-dim">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="practices" className="mt-20">
        <h2 id="practices" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
          Habits that keep it running
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {PRACTICES.map((p) => (
            <div key={p.title} className="border-t border-border pt-4">
              <dt className="wide-sm text-lg font-bold text-fg">{p.title}</dt>
              <dd className="mt-2 leading-relaxed text-fg-dim">{p.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="running" className="mt-20">
        <h2 id="running" className="wide-sm text-2xl font-bold text-fg sm:text-3xl">
          What&apos;s on it
        </h2>
        <p className="mt-3 max-w-prose text-fg-dim">Every live app on the server, checked from your browser.</p>
        <div className="relative mt-6 overflow-x-auto rounded-md border border-border">
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
