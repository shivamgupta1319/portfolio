"use client";

import { useTheme } from "./useTheme";

/**
 * Light/dark switch. Both icons are always in the DOM and CSS picks one, so
 * the markup is identical before and after hydration (no flash, no mismatch).
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, hydrated, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      aria-pressed={hydrated ? theme === "light" : undefined}
      title="Toggle light / dark"
      className={`grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-2 text-fg-dim transition hover:border-border-strong hover:text-fg ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="icon-moon h-4 w-4 [[data-theme=light]_&]:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="icon-sun hidden h-4 w-4 [[data-theme=light]_&]:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
