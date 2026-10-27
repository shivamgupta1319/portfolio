import type { Quest } from "@/data/types";

function hue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

/**
 * Cover for the profile page: the screenshot when one exists, otherwise a
 * quiet typographic plate in the page palette (not a gradient wash).
 */
export default function ProjectImage({
  quest,
  eager = false,
  className = "",
}: {
  quest: Quest;
  eager?: boolean;
  className?: string;
}) {
  if (quest.screenshot) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized
      <img
        src={quest.screenshot}
        alt={`${quest.title} screenshot`}
        width={1280}
        height={800}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`aspect-[16/10] w-full object-cover object-top ${className}`}
      />
    );
  }
  const h = hue(quest.id);
  return (
    <div
      aria-hidden
      className={`relative flex aspect-[16/10] w-full items-end overflow-hidden bg-bg-2 p-6 sm:p-8 ${className}`}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, hsl(${h} 30% 50% / 0.08) 0 1px, transparent 1px 14px)`,
        }}
      />
      <span className="relative text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-fg [font-stretch:90%]">
        {quest.title}
      </span>
    </div>
  );
}
