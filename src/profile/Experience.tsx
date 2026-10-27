import { experience } from "@/data/experience";
import Section from "./Section";
import ExperienceTimeline from "./ExperienceTimeline";

export default function Experience() {
  return (
    <Section id="experience" title="Experience" intro="Four years at a product studio, shipping real-time, AI and fintech systems.">
      <ExperienceTimeline entries={experience} />
    </Section>
  );
}
