import { profile } from "@/data/profile";
import CopyEmailButton from "./CopyEmailButton";
import ResumeLink from "./ResumeLink";
import Reveal from "./motion/Reveal";

const SOCIAL = [
  { label: "LinkedIn", href: profile.linkedin },
  { label: "GitHub", href: profile.github },
  ...(profile.npm ? [{ label: "npm", href: `https://www.npmjs.com/~${profile.npm}` }] : []),
  ...(profile.devto ? [{ label: "dev.to", href: profile.devto }] : []),
];

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2
            id="contact-title"
            className="max-w-4xl text-[clamp(2.5rem,8vw,6rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-fg [font-stretch:90%]"
          >
            Hiring for a full-stack or AI role? Let&apos;s talk.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-dim">
            I&apos;m looking for senior full-stack and AI engineering roles, remote-first or in Jaipur, and
            I&apos;m happy to relocate within India. Email is the fastest way to reach me.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <a
            href={`mailto:${profile.email}`}
            className="inline-block py-1.5 text-[clamp(1.5rem,5vw,3rem)] font-medium leading-tight tracking-[-0.02em] text-accent underline decoration-1 underline-offset-[0.2em] [overflow-wrap:anywhere] hover:decoration-2"
          >
            {profile.email}
          </a>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyEmailButton />
            <ResumeLink />
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 min-w-11 items-center text-lg text-fg-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  {s.label}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
