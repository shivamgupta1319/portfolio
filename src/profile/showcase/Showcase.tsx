import { showcase } from "@/data/quests";
import Section from "../Section";
import ShowcaseIndex from "./ShowcaseIndex";
import ShowcaseCarousel from "./ShowcaseCarousel";

export default function Showcase() {
  return (
    <Section
      id="work"
      title="Selected work"
      intro="Ten projects that show how I build: live SaaS products, AI systems and real-time infrastructure."
    >
      <div className="hidden lg:block">
        <ShowcaseIndex quests={showcase} />
      </div>
      <div className="lg:hidden">
        <ShowcaseCarousel quests={showcase} />
      </div>
    </Section>
  );
}
