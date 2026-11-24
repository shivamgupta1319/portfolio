import type { CSSProperties, ReactNode } from "react";
import { RiseText } from "./motion";

/** The opening of every inner page: eyebrow, a title whose words rise in, and a lede. */
export default function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <p className="fade-up font-medium text-accent">{eyebrow}</p>
      <h1 className="wide mt-3 text-[clamp(2.6rem,7vw,4.75rem)] font-semibold leading-[0.98] text-fg">
        <RiseText text={title} start={0.05} step={0.06} />
      </h1>
      {lede && (
        <div className="fade-up mt-5 text-lg leading-relaxed text-fg-dim sm:text-xl" style={{ "--d": "0.3s" } as CSSProperties}>
          {lede}
        </div>
      )}
      {children && (
        <div className="fade-up mt-7" style={{ "--d": "0.4s" } as CSSProperties}>
          {children}
        </div>
      )}
    </header>
  );
}
