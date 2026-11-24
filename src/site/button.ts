/** Shared button look for site pages: 6px radius, ≥44px tall. */
export function buttonClass(variant: "primary" | "ghost" = "primary", size: "sm" | "md" = "md"): string {
  const base = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-semibold transition-colors ${
    size === "sm" ? "px-3.5 text-sm" : "px-5 text-base"
  }`;
  const look =
    variant === "primary"
      ? "bg-accent-fill text-on-accent hover:brightness-110"
      : "border border-border-strong text-fg hover:bg-panel-2";
  return `${base} ${look}`;
}
