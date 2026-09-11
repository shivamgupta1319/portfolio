import type { Quest } from "@/data/types";

function hue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function initials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** Screenshot when one exists, otherwise a deterministic gradient cover. */
export default function ProjectCover({
  quest,
  short = false,
  eager = false,
}: {
  quest: Quest;
  /** shorter cover for dense grids */
  short?: boolean;
  /** above-the-fold covers should not be lazy */
  eager?: boolean;
}) {
  const aspect = short ? "aspect-[5/2]" : "aspect-[16/10]";
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
        className={`${aspect} w-full object-cover object-top`}
      />
    );
  }
  const h = hue(quest.id);
  return (
    <div
      aria-hidden
      className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 60% 18%) 0%, hsl(${(h + 40) % 360} 55% 10%) 100%)`,
      }}
    >
      <div
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full blur-2xl"
        style={{ background: `hsl(${(h + 60) % 360} 80% 55% / 0.35)` }}
      />
      <span className="font-mono text-3xl font-semibold tracking-tight text-white/70">
        {initials(quest.title)}
      </span>
    </div>
  );
}
