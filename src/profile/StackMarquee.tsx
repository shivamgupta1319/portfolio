import { skills } from "@/data/skills";

/** Core stack (résumé-backed) as a slow ticker. Decorative; the Skills section is the accessible list. */
const ITEMS = skills.filter((s) => s.tier <= 1).map((s) => s.label);

function Run() {
  return (
    <ul className="flex shrink-0 items-center">
      {ITEMS.map((label) => (
        <li key={label} className="flex items-center whitespace-nowrap">
          <span className="px-6 text-2xl font-medium tracking-tight text-fg-dim sm:text-3xl">{label}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-fill" />
        </li>
      ))}
    </ul>
  );
}

export default function StackMarquee() {
  return (
    <div aria-hidden className="marquee overflow-hidden border-y border-border py-5">
      <div className="marquee-track flex w-max">
        <Run />
        <Run />
      </div>
    </div>
  );
}
