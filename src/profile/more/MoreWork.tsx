import Link from "next/link";
import { allQuests, moreWork } from "@/data/quests";
import Section from "../Section";
import MoreWorkList from "./MoreWorkList";

export default function MoreWork() {
  return (
    <Section id="more" title="More work" intro="Smaller products, SDKs and market-research tools I built and still maintain.">
      <MoreWorkList quests={moreWork} />
      <p className="mt-8 text-base text-fg-dim">
        Want the full list?{" "}
        <Link href="/desktop?app=questlog" prefetch={false} className="font-medium text-accent underline-offset-4 hover:underline">
          Browse all {allQuests.length} projects in Desktop mode
        </Link>
      </p>
    </Section>
  );
}
