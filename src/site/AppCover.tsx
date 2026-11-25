import type { App } from "@/data/apps";
import { shotSrcSet } from "./images";

/** Screenshot when one exists; otherwise a quiet typographic panel (no decoration). */
export default function AppCover({
  app,
  eager = false,
  sizes = "(min-width: 768px) 50vw, 100vw",
}: {
  app: App;
  eager?: boolean;
  /** How wide the cover is drawn, so the browser picks the 640 or 1280 copy. */
  sizes?: string;
}) {
  if (app.screenshot) {
    const webp = shotSrcSet(app.screenshot);
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized
      <img
        src={app.screenshot}
        alt={`${app.title}, screenshot of the live app`}
        width={1280}
        height={800}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="aspect-[16/10] h-auto w-full object-cover object-top"
      />
    );
    return webp ? (
      <picture>
        <source type="image/webp" srcSet={webp} sizes={sizes} />
        {img}
      </picture>
    ) : (
      img
    );
  }
  return (
    <div aria-hidden className="flex aspect-[16/10] w-full flex-col justify-end gap-1 bg-panel-2 p-6 sm:p-8">
      <span className="wide text-3xl font-bold leading-none text-fg sm:text-4xl">{app.title}</span>
      <span className="font-mono text-[0.8125rem] text-fg-mute">{app.host ?? (app.npmUrl ? "npm package" : "private repository")}</span>
    </div>
  );
}
