"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import ThemeToggle from "@/theme/ThemeToggle";
import { track } from "@/analytics/track";
import ResumeLink from "./ResumeLink";
import { DURATION, EASE_OUT } from "./motion/ease";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#experience", label: "Experience" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

function DesktopModeLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/desktop"
      prefetch={false}
      onClick={() => track("mode_switch", { to: "desktop" })}
      title="Explore the same portfolio as an interactive desktop"
      className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm text-fg-dim transition-colors hover:text-fg ${className}`}
    >
      Desktop mode
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

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
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled || open ? "border-b border-border bg-bg/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <a href="#top" className="mr-auto inline-flex min-h-11 items-center text-lg font-semibold tracking-tight text-fg">
          Shivam Gupta
        </a>

        <ul className="hidden items-center md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex min-h-11 items-center px-3 text-sm text-fg-dim transition-colors hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden lg:block">
            <DesktopModeLink />
          </span>
          <ThemeToggle className="!h-11 !w-11 !rounded-full !border-transparent !bg-transparent hover:!bg-panel-2" />
          <span className="hidden sm:block">
            <ResumeLink size="sm" />
          </span>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-full text-fg md:hidden"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3 7h14M3 13h14" />}
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            className="overflow-hidden md:hidden"
          >
            <div className="px-4 pb-5 pt-1">
              <ul className="flex flex-col">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center border-b border-border text-2xl font-medium text-fg"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ResumeLink className="flex-1" />
                <DesktopModeLink />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
