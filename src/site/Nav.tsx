"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/theme/ThemeToggle";
import { track } from "@/analytics/track";
import ResumeButton from "./ResumeButton";
import { NAV_LINKS } from "./navLinks";

function isActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return p === href || p.startsWith(href);
}

/** The interactive game-OS lives at /desktop, unchanged; this is its front door. */
function DesktopModeLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/desktop/"
      prefetch={false}
      onClick={() => {
        track("mode_switch", { to: "desktop" });
        onNavigate?.();
      }}
      title="Explore the same portfolio as an interactive desktop"
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-fg-dim transition-colors hover:border-border-strong hover:text-fg"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
        <path d="M7 16.5h6M10 13.5v3" strokeLinecap="round" />
      </svg>
      <span className="sm:hidden">Desktop</span>
      <span className="hidden sm:inline">Desktop mode</span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation (adjust state during render, no effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape closes the drawer and returns focus to its toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <Link
          href="/"
          className="wide-sm mr-auto inline-flex min-h-11 min-w-0 items-center truncate text-lg font-bold text-fg"
        >
          Shivam Gupta
        </Link>

        <ul className="hidden items-center md:flex">
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex min-h-11 items-center px-3 text-[0.9375rem] transition-colors ${
                    active ? "text-fg" : "text-fg-dim hover:text-fg"
                  }`}
                >
                  {l.label}
                  {active && <span aria-hidden className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-accent-fill" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <DesktopModeLink />
        <ThemeToggle className="!h-11 !w-11 !rounded-md !border-transparent !bg-transparent hover:!bg-panel-2" />
        <span className="hidden lg:block">
          <ResumeButton size="sm" />
        </span>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-fg hover:bg-panel-2 md:hidden"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="site-menu" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border md:hidden">
          <ul className="px-4 py-2">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`wide-sm flex min-h-13 items-center border-b border-border text-xl font-semibold ${
                      active ? "text-accent" : "text-fg"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-5 pt-2">
            <ResumeButton />
          </div>
        </div>
      )}
    </header>
  );
}
