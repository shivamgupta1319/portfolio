import Link from "next/link";
import { profile } from "@/data/profile";
import { liveApps } from "@/data/apps";
import { NAV_LINKS } from "./navLinks";

const EXTERNAL = [
  { href: profile.github, label: "GitHub" },
  { href: profile.linkedin, label: "LinkedIn" },
  { href: `mailto:${profile.email}`, label: "Email" },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="wide-sm text-lg font-bold text-fg">{profile.name}</p>
          <p className="mt-2 text-fg-dim">
            Built, hosted and monitored by me. {liveApps.length} apps run on my own server behind
            Cloudflare; this site is a static build on Netlify.
          </p>
        </div>
        <nav aria-label="Site">
          <ul className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center text-fg-dim hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/desktop/" prefetch={false} className="inline-flex min-h-11 items-center text-fg-dim hover:text-fg">
                Desktop mode
              </Link>
            </li>
          </ul>
        </nav>
        <ul className="grid content-start gap-1" aria-label="Elsewhere">
          {EXTERNAL.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noreferrer noopener me" : undefined}
                className="inline-flex min-h-11 items-center text-fg-dim hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-sm text-fg-mute sm:px-6">
        © {new Date().getFullYear()} {profile.name}, {profile.location}
      </p>
    </footer>
  );
}
