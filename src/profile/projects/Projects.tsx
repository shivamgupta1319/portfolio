import { catalogue } from "@/data/quests";
import Section from "../Section";
import ProjectsGrid from "./ProjectsGrid";

export default function Projects() {
  return (
    <Section
      id="projects"
      title="All projects"
      sub="quest log"
      intro="Everything I've shipped or am actively building — filter by area or search the stack."
    >
      <ProjectsGrid quests={catalogue} />
    </Section>
  );
}
