/** Shared button look for site pages: pill, ≥44px tall, a small lift on hover. */
export function buttonClass(variant: "primary" | "ghost" = "primary", size: "sm" | "md" = "md"): string {
  const base = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 active:translate-y-0 ${
    size === "sm" ? "px-3.5 text-sm" : "px-5 text-base"
  }`;
  const look =
    variant === "primary"
      ? "bg-fg text-bg-2 hover:shadow-[0_8px_20px_-8px_rgba(28,38,31,0.5)]"
      : "border border-border-strong bg-bg-2/60 text-fg hover:bg-bg-2";
  return `${base} ${look}`;
}
