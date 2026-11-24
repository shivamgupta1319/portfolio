/** Round arrow that turns when its `group` parent is hovered. `dark` is for use on ink or plum panels. */
export default function Arrow({ dark = false, external = false }: { dark?: boolean; external?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-[background-color,color,transform] duration-300 group-hover:-rotate-45 ${
        dark
          ? "border-white/30 group-hover:bg-bg-2 group-hover:text-fg"
          : "border-border-strong text-fg group-hover:bg-fg group-hover:text-bg-2"
      } ${external ? "-rotate-45 group-hover:rotate-0" : ""}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h12M11 5l5 5-5 5" />
      </svg>
    </span>
  );
}
