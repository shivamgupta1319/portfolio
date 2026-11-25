"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { track } from "@/analytics/track";
import { profile } from "@/data/profile";
import ResumeButton from "./ResumeButton";
import { NAV_LINKS } from "./navLinks";
import { AVATAR } from "./images";

function isActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return p === href || p.startsWith(href);
}

function DesktopIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
      <path d="M7 16.5h6M10 13.5v3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Header: photo mark and name, four links, the desktop-mode door and the résumé.
 * At the top it is a plain bar; once the page scrolls it tightens into a floating pill.
 */
export default function Nav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation (adjust state during render, no effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const pill = scrolled || open;

  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
      <div
        className={`mx-auto max-w-6xl rounded-[22px] border transition-[background-color,border-color,box-shadow,max-width] duration-500 ease-[var(--ease-out)] ${
          pill
            ? "max-w-5xl border-border bg-bg-2/85 shadow-[0_10px_30px_-12px_rgba(28,38,31,0.25)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <nav aria-label="Primary" className="flex h-14 items-center gap-1 px-2 sm:h-16 sm:gap-2 sm:px-3">
          <Link href="/" className="mr-auto inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-full pr-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img
              src={AVATAR}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-bg-2"
            />
            <span className="truncate text-[1.05rem] font-semibold tracking-tight text-fg">{profile.name}</span>
          </Link>

          <ul className="hidden items-center md:flex">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.9375rem] font-medium transition-colors ${
                      active ? "bg-accent-soft text-accent-2" : "text-fg-dim hover:bg-panel-2 hover:text-fg"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/desktop/"
            prefetch={false}
            onClick={() => track("mode_switch", { to: "desktop" })}
            aria-label="Desktop mode: explore this portfolio as an interactive desktop"
            title="Desktop mode"
            className="hidden h-11 w-11 place-items-center rounded-full text-fg-dim transition-colors hover:bg-panel-2 hover:text-fg sm:grid"
          >
            <DesktopIcon />
          </Link>
          <span className="hidden sm:block">
            <ResumeButton size="sm" />
          </span>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg hover:bg-panel-2 md:hidden"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3 7h14M3 13h14" />}
            </svg>
          </button>
        </nav>

        {open && (
          <div id="site-menu" className="max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 pb-4 md:hidden">
            <ul className="border-t border-border pt-2">
              {NAV_LINKS.map((l, i) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href} className="fade-up" style={{ "--d": `${i * 0.05}s` } as React.CSSProperties}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-13 items-center text-2xl font-semibold tracking-tight ${
                        active ? "text-accent" : "text-fg"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ResumeButton />
              <Link
                href="/desktop/"
                prefetch={false}
                onClick={() => track("mode_switch", { to: "desktop" })}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 font-semibold text-fg"
              >
                <DesktopIcon />
                Desktop mode
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
