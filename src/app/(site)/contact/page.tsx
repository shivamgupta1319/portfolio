import type { Metadata } from "next";
import { profile } from "@/data/profile";
import CopyEmail from "@/site/CopyEmail";
import ResumeButton from "@/site/ResumeButton";
import { buttonClass } from "@/site/button";

export const metadata: Metadata = {
  title: "Contact — Shivam Gupta",
  description: "Get in touch with Shivam Gupta: email, LinkedIn, GitHub and résumé.",
  alternates: { canonical: "/contact/" },
};

const CHANNELS = [
  { label: "LinkedIn", value: "in/myselfshivam", href: profile.linkedin },
  { label: "GitHub", value: profile.githubUser, href: profile.github },
  ...(profile.devto ? [{ label: "dev.to", value: profile.devto.replace(/^https?:\/\//, ""), href: profile.devto }] : []),
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
      <h1 className="wide text-4xl font-bold leading-[1.05] text-fg sm:text-5xl">Contact</h1>
      <p className="mt-3 max-w-2xl text-lg text-fg-dim">
        Hiring for a full-stack or AI engineering role, or want something built and run? Email is the fastest way to
        reach me.
      </p>

      <section aria-labelledby="email" className="mt-10 rounded-[10px] border border-border bg-bg-2 p-6 sm:p-8">
        <h2 id="email" className="text-[0.9375rem] text-fg-mute">
          Email
        </h2>
        <a
          href={`mailto:${profile.email}`}
          className="wide mt-1 block break-all text-2xl font-bold text-fg hover:text-accent sm:text-4xl"
        >
          {profile.email}
        </a>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className={buttonClass("primary")}>
            Write an email
          </a>
          <CopyEmail />
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="channels">
          <h2 id="channels" className="wide-sm text-xl font-bold text-fg">
            Elsewhere
          </h2>
          <ul className="mt-3">
            {CHANNELS.map((c) => (
              <li key={c.label} className="border-b border-border">
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer noopener me"
                  className="flex min-h-14 items-center justify-between gap-4 text-fg hover:text-accent"
                >
                  <span className="font-semibold">{c.label}</span>
                  <span className="truncate font-mono text-[0.875rem] text-fg-mute">{c.value}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="cv">
          <h2 id="cv" className="wide-sm text-xl font-bold text-fg">
            Résumé
          </h2>
          <p className="mt-3 text-fg-dim">
            PDF download. Based in {profile.location}.
          </p>
          <ResumeButton className="mt-4" />
        </section>
      </div>
    </div>
  );
}
