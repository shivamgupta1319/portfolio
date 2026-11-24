import { liveApps } from "./apps";

/**
 * Facts about the server the live apps run on, read from the machine on
 * INFRA_AS_OF (docker ps, nproc, free). Update by re-reading, never by guessing.
 * Deliberately excludes addresses, ports and anything secret.
 */
export const INFRA_AS_OF = "2026-11-24";

export interface InfraFact {
  label: string;
  value: string;
}

export const INFRA_FACTS: InfraFact[] = [
  { label: "Live apps", value: String(liveApps.length) },
  { label: "Containers", value: "79" },
  { label: "Compose stacks", value: "23" },
  { label: "Cloudflare tunnels", value: "3" },
  { label: "CPU cores", value: "8" },
  { label: "Memory", value: "14 GB" },
];

/** The request path, outermost first; rendered as the diagram on /infra. */
export const REQUEST_PATH: { name: string; detail: string }[] = [
  { name: "Visitor", detail: "Any browser, anywhere" },
  { name: "Cloudflare edge", detail: "DNS, TLS and caching for pseo.cloud and resite.live" },
  { name: "Cloudflare tunnel", detail: "cloudflared dials out from the server, so no app needs an inbound port" },
  { name: "nginx per app", detail: "Public overview page, sign-in wall or per-visitor rate limit, decided per route" },
  { name: "App containers", detail: "Web, API, workers and schedulers in one Compose stack per app" },
  { name: "A database per app", detail: "Postgres for most, SQLite where that is enough; no shared schema" },
];

export interface Practice {
  title: string;
  body: string;
}

export const PRACTICES: Practice[] = [
  {
    title: "A public page in front of a private app",
    body: "Repo Intelligence, Smart Trader, Crypto AI and AI Router open on a public overview at /. nginx serves that page without auth and keeps the app itself behind a sign-in, so a recruiter clicking a link reads about the product instead of hitting a password prompt.",
  },
  {
    title: "Open tools, limited per visitor",
    body: "The IPO tracker, dividend screener and market news are usable without an account. Each visitor is rate-limited on their real IP as Cloudflare reports it, and anything that writes or costs money stays behind auth.",
  },
  {
    title: "Build on my machine, pull on the server",
    body: "For most stacks, images are built and tested on my development PC, pushed to a registry and pulled on the server. Builds stay off the server, so a deploy doesn't eat the CPU the live apps need.",
  },
  {
    title: "One AI gateway for every app",
    body: "Apps that need a model call AI Router with their own project key. Provider failover, budgets and health checks live in one place instead of being copied into every codebase.",
  },
  {
    title: "Back up before deploying",
    body: "Where data matters, the deploy takes a database backup first. TripSplit's deploy script does this every time, so a bad migration is an undo, not an incident.",
  },
  {
    title: "Watched, not hoped for",
    body: "Beszel tracks CPU, memory, disk and every container on the box, and the status dots on this site check each app from your own browser.",
  },
];
