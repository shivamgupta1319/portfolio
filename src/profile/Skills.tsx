import Link from "next/link";
import { skillsByGroup, SKILL_GROUP_LABELS, SKILL_GROUP_ORDER } from "@/data/skills";
import Section from "./Section";
import Reveal from "./motion/Reveal";

export default function Skills() {
  return (
    <Section id="skills" title="Skills" intro="The stack I ship with, as listed on my résumé. Core skills first.">
      <div className="border-t border-border">
        {SKILL_GROUP_ORDER.map((g, i) => (
          <Reveal key={g} y={16} delay={i * 0.04}>
            <div className="grid gap-4 border-b border-border py-6 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-10">
              <h3 className="text-xl font-semibold tracking-[-0.01em] text-fg">{SKILL_GROUP_LABELS[g]}</h3>
              <ul className="flex flex-wrap gap-2">
                {skillsByGroup[g].map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-full px-3.5 py-1.5 text-base ${
                      n.tier === 0 ? "bg-fg font-medium text-bg" : "border border-border-strong text-fg-dim"
                    }`}
                  >
                    {n.label}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 text-base text-fg-dim">
        Prefer something more playful?{" "}
        <Link href="/desktop?app=skilltree" prefetch={false} className="font-medium text-accent underline-offset-4 hover:underline">
          Open the skill tree in Desktop mode
        </Link>
      </p>
    </Section>
  );
}
