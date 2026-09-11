import { channels } from "@/data/contact";
import Section from "./Section";
import CopyEmailButton from "./CopyEmailButton";
import ResumeLink from "./ResumeLink";

export default function Contact() {
  return (
    <Section
      id="contact"
      title="Contact"
      sub="comms link"
      intro="Open to senior full-stack and AI engineering roles — remote-first or Jaipur, and happy to relocate within India."
    >
      <div className="flex flex-col gap-6">
        <CopyEmailButton />
        <ul className="grid gap-3 sm:grid-cols-3">
          {channels.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-2/60 px-3 py-3 transition hover:border-border-strong"
              >
                <span
                  aria-hidden
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-bg font-mono text-xs ${c.accent}`}
                >
                  {c.glyph}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-xs uppercase tracking-wider text-fg-mute">
                    {c.label}
                  </span>
                  <span className="block truncate text-sm text-fg">{c.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div>
          <ResumeLink variant="ghost" />
        </div>
      </div>
    </Section>
  );
}
