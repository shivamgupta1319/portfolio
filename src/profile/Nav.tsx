"use client";

import { useEffect, useRef, useState } from "react";
import XpBadge from "@/hud/XpBadge";
import ThemeToggle from "@/theme/ThemeToggle";
import ModeSwitch from "./ModeSwitch";
import ResumeLink from "./ResumeLink";

const LINKS = [
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the toggle button.
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
    <header className="sticky top-0 z-40 border-b border-border bg-bg/75 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-mono text-sm font-semibold text-fg">
          <span aria-hidden className="text-accent-2">▣</span>
          shivamOS
        </a>

        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm text-fg-dim transition hover:bg-panel hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <XpBadge compact />
          <ResumeLink className="hidden !py-1.5 !text-xs sm:inline-flex" />
          <ModeSwitch className="hidden md:inline-flex" />
          <ThemeToggle />
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-2 text-fg-dim md:hidden"
          >
            <span aria-hidden className="font-mono text-base leading-none">
              {open ? "×" : "≡"}
            </span>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-border bg-bg/95 px-4 pb-4 pt-2 backdrop-blur-md md:hidden"
      >
        <ul className="flex flex-col">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-base text-fg-dim hover:bg-panel hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <ResumeLink className="flex-1" />
          <ModeSwitch className="flex-1 justify-center !py-2.5" />
        </div>
      </div>
    </header>
  );
}
