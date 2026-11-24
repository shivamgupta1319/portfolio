import type { App } from "@/data/apps";

/** Screenshot when one exists; otherwise a quiet typographic panel (no decoration). */
export default function AppCover({ app, eager = false }: { app: App; eager?: boolean }) {
  if (app.screenshot) {
    return (
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
  }
  return (
    <div aria-hidden className="flex aspect-[16/10] w-full flex-col justify-end gap-1 bg-panel-2 p-6 sm:p-8">
      <span className="wide text-3xl font-bold leading-none text-fg sm:text-4xl">{app.title}</span>
      <span className="font-mono text-[0.8125rem] text-fg-mute">{app.host ?? (app.npmUrl ? "npm package" : "private repository")}</span>
    </div>
  );
}
