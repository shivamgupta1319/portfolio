"use client";

import { track } from "@/analytics/track";
import { buttonClass } from "./button";

/** External link styled as a button; opens in a new tab and is tracked. */
export default function OutLink({
  href,
  id,
  target,
  primary = false,
  children,
}: {
  href: string;
  id: string;
  target: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => track("project_click", { id, target })}
      className={`${buttonClass(primary ? "primary" : "ghost")} min-w-0 max-w-full`}
    >
      <span className="truncate">{children}</span>
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 11 11 5M6 5h5v5" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
