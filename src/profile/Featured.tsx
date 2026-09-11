import { featuredTop } from "@/data/quests";
import ProjectCard from "@/components/ProjectCard";
import Section from "./Section";

export default function Featured() {
  return (
    <Section
      id="featured"
      title="Featured work"
      sub="main quests"
      intro="Six projects that best show how I build: live products, measured AI systems and real-time infrastructure."
      className="!pt-4"
    >
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {featuredTop.map((q) => (
          <li key={q.id} className="flex">
            <div className="flex w-full">
              <ProjectCard quest={q} variant="featured" />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
