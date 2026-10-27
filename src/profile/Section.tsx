import Reveal from "./motion/Reveal";

interface SectionProps {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Section({ id, title, intro, children, className = "" }: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={`scroll-mt-16 py-16 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mb-10 flex flex-col gap-4 sm:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h2
            id={headingId}
            className="text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-fg [font-stretch:92%]"
          >
            {title}
          </h2>
          {intro && <p className="max-w-md text-base leading-relaxed text-fg-dim sm:text-lg">{intro}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
