import SectionXp from "./SectionXp";

interface SectionProps {
  id: string;
  /** plain-language heading (the primary label) */
  title: string;
  /** game-flavoured subtitle, decorative */
  sub?: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Section({ id, title, sub, intro, children, className = "" }: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-20 py-14 sm:py-20 ${className}`}
    >
      <div className="mb-8 flex flex-col gap-2">
        {sub && (
          <span aria-hidden className="game-sub">
            {sub}
          </span>
        )}
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {title}
        </h2>
        {intro && <p className="max-w-2xl text-base text-fg-dim">{intro}</p>}
      </div>
      <SectionXp id={id} label={title} />
      {children}
    </section>
  );
}
