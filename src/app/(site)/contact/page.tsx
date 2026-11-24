import type { Metadata } from "next";
import { profile } from "@/data/profile";
import CopyEmail from "@/site/CopyEmail";
import ResumeButton from "@/site/ResumeButton";
import PageHeader from "@/site/PageHeader";
import Arrow from "@/site/Arrow";
import { Reveal } from "@/site/motion";

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
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <PageHeader
        eyebrow="Contact"
        title="Let's build something."
        lede={
          <p>
            Hiring for a software or AI engineering role, or want something built and run? Email is the fastest way to
            reach me.
          </p>
        }
      />

      <Reveal className="mt-12">
        <section aria-labelledby="email" className="rounded-[32px] bg-accent-fill p-6 text-on-accent sm:p-10">
          <h2 id="email" className="font-medium text-white/80">
            Email
          </h2>
          <a
            href={`mailto:${profile.email}`}
            className="wide mt-2 block text-[clamp(1.5rem,5.6vw,3.5rem)] font-semibold leading-tight [overflow-wrap:anywhere] hover:underline hover:decoration-white/40 hover:underline-offset-8"
          >
            {profile.email.split("@")[0]}@<wbr />
            {profile.email.split("@")[1]}
          </a>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-accent-2 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Write an email
            </a>
            <CopyEmail onDark />
          </div>
        </section>
      </Reveal>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Reveal delay={0.05}>
          <section aria-labelledby="channels" className="h-full rounded-[28px] border border-border bg-bg-2 p-6 sm:p-8">
            <h2 id="channels" className="wide-sm text-2xl font-semibold text-fg">
              Elsewhere
            </h2>
            <ul className="mt-4 grid gap-1">
              {CHANNELS.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer noopener me"
                    className="group flex min-h-16 items-center justify-between gap-4 border-b border-border text-fg last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.label}</span>
                      <span className="block truncate font-mono text-[0.8125rem] text-fg-mute">{c.value}</span>
                    </span>
                    <Arrow external />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
        <Reveal delay={0.12}>
          <section aria-labelledby="cv" className="flex h-full flex-col rounded-[28px] bg-fg p-6 text-bg-2 sm:p-8">
            <h2 id="cv" className="wide-sm text-2xl font-semibold">
              Résumé
            </h2>
            <p className="mt-2 text-[#c6cec7]">One page, PDF. Based in {profile.location}.</p>
            <div className="mt-auto pt-8">
              <ResumeButton className="!bg-bg-2 !text-fg" />
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
