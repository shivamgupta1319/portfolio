"use client";

import { useOsStore } from "@/os/store";
import { APP_ORDER, APP_META } from "@/os/apps.meta";
import { APPS } from "@/os/apps.registry";
import type { AppId } from "@/os/types";

const APP_BLURB: Record<AppId, string> = {
  guide: "This manual.",
  terminal: "A real command line — type help, or an app name to open it.",
  character: "About me: a character sheet with skill stat-bars and traits.",
  questlog: "Projects as ranked quests (S/A/B) with live links and stacks.",
  skilltree: "My tech stack as an unlockable skill tree.",
  campaign: "Experience & education as a campaign timeline.",
  contact: "Ways to reach me — copy my email or grab my résumé.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-mute">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-dim">
      {children}
    </kbd>
  );
}

export default function GuideApp() {
  const openApp = useOsStore((s) => s.openApp);

  return (
    <div className="os-scroll h-full overflow-auto bg-bg/30 p-5 text-sm leading-relaxed text-fg-dim">
      <div className="flex items-center gap-2">
        <span className="text-lg text-cyan">?</span>
        <h2 className="text-base font-semibold text-fg">
          Welcome to shivamOS
        </h2>
      </div>
      <p className="mt-2">
        This portfolio is a tiny operating system. Everything is an app you can
        open, drag, resize and close — explore however you like. Here&apos;s the
        full tour.
      </p>

      <Section title="◆ Open & manage apps">
        <ul className="space-y-1.5">
          <li>
            <span className="text-fg">Launch</span> — click an icon in the left
            dock, the <span className="text-accent-2">▣ Start menu</span>{" "}
            (bottom-left), or type its name in the terminal.
          </li>
          <li>
            <span className="text-fg">Move / resize</span> — drag a window&apos;s
            title bar; drag any edge or corner to resize.
          </li>
          <li>
            <span className="text-fg">Window buttons</span> —{" "}
            <span className="text-rose">×</span> close,{" "}
            <span className="text-amber">–</span> minimize (to the taskbar),{" "}
            <span className="text-green">+</span> maximize. Double-click the
            title bar to maximize too.
          </li>
          <li>
            <span className="text-fg">Taskbar</span> (bottom) — switch between
            running apps; the clock and a sound toggle live on the right.
          </li>
        </ul>
      </Section>

      <Section title="◆ The apps">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {APP_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => openApp(id)}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-bg-2/60 p-2.5 text-left transition hover:border-border-strong"
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-bg font-mono text-xs ${APPS[id].accent}`}
              >
                {APPS[id].glyph}
              </span>
              <span>
                <span className="block font-mono text-xs text-fg">
                  {APP_META[id].short}
                </span>
                <span className="block text-xs text-fg-dim">
                  {APP_BLURB[id]}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="◆ Terminal commands">
        <p className="mb-2">
          Open the terminal and type <span className="text-green">help</span>.
          Useful ones:
        </p>
        <ul className="space-y-1 font-mono text-xs">
          <li>
            <span className="text-green">guide</span>{" "}
            <span className="text-fg-mute">— open this manual</span>
          </li>
          <li>
            <span className="text-green">whoami</span>{" "}
            <span className="text-fg-mute">— quick profile summary</span>
          </li>
          <li>
            <span className="text-green">ls</span>{" "}
            <span className="text-fg-mute">— list every app</span>
          </li>
          <li>
            <span className="text-green">open &lt;app&gt;</span>{" "}
            <span className="text-fg-mute">— launch an app (or just type its name)</span>
          </li>
          <li>
            <span className="text-green">social</span>{" "}
            <span className="text-fg-mute">— my links</span> ·{" "}
            <span className="text-green">clear</span> ·{" "}
            <span className="text-green">exit</span>
          </li>
        </ul>
        <p className="mt-2 text-xs">
          Tip: a bare app name works too — e.g.{" "}
          <span className="font-mono text-cyan">quests</span>,{" "}
          <span className="font-mono text-cyan">skills</span>,{" "}
          <span className="font-mono text-cyan">about</span>.
        </p>
      </Section>

      <Section title="◆ Game layer">
        <ul className="space-y-1.5">
          <li>
            <span className="text-fg">XP &amp; level</span> — the bar up top
            fills as you discover apps. Find them all to level up. ⚡
          </li>
          <li>
            <span className="text-fg">Sound</span> — off by default; toggle it
            from the taskbar (♪) for synthesized UI sounds.
          </li>
          <li>
            <span className="text-fg">Quest ranks</span> — projects are graded
            S / A / B; S-tier are the flagships.
          </li>
        </ul>
      </Section>

      <Section title="◆ Shortcuts & sharing">
        <ul className="space-y-1.5">
          <li>
            <Key>Esc</Key> closes the focused window.
          </li>
          <li>
            <Key>↑</Key> / <Key>↓</Key> scroll command history in the terminal.
          </li>
          <li>
            Deep links — append{" "}
            <span className="font-mono text-cyan">?app=questlog</span> to the URL
            to open straight into an app. The address bar updates as you switch
            apps, so any view is shareable.
          </li>
          <li>
            On a phone, it becomes a home screen — tap an app, use{" "}
            <span className="font-mono">‹ back</span> to return.
          </li>
        </ul>
      </Section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => openApp("questlog")}
          className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-xs text-amber transition hover:bg-amber/20"
        >
          ✦ jump to the Quest Log
        </button>
        <button
          onClick={() => openApp("contact")}
          className="rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs text-fg-dim transition hover:text-fg"
        >
          ✉ get in touch
        </button>
      </div>
    </div>
  );
}
