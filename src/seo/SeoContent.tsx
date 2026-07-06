import { profile } from "@/data/profile";
import { mainQuests, sideQuests } from "@/data/quests";
import { experience } from "@/data/experience";
import { bio, traits } from "@/data/about";
import { skills, SKILL_GROUP_LABELS } from "@/data/skills";
import type { SkillNode } from "@/data/types";
import JsonLd from "./JsonLd";

/**
 * Always-rendered, visually-hidden content so crawlers, no-JS visitors and
 * screen readers get the real substance even though the OS UI loads it lazily.
 */
export default function SeoContent() {
  // Group skill nodes by cluster so the crawlable list mirrors the tech tree.
  const skillsByGroup = skills.reduce<Record<string, SkillNode[]>>(
    (acc, node) => {
      (acc[node.group] ??= []).push(node);
      return acc;
    },
    {},
  );

  return (
    <div className="sr-only">
      <JsonLd />

      <h1>
        {profile.name} — {profile.role}
      </h1>
      <p>{profile.tagline}</p>
      <p>
        {profile.role} based in {profile.location}. Contact:{" "}
        <a href={`mailto:${profile.email}`}>{profile.email}</a> ·{" "}
        <a href={profile.github}>GitHub</a> ·{" "}
        <a href={profile.linkedin}>LinkedIn</a>.
      </p>

      <h2>About {profile.name}</h2>
      {bio.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}

      <h2>Skills &amp; Expertise</h2>
      <ul>
        {traits.map((t) => (
          <li key={t.title}>
            <strong>{t.title}</strong>: {t.detail}
          </li>
        ))}
      </ul>
      <ul>
        {Object.entries(skillsByGroup).map(([group, nodes]) => (
          <li key={group}>
            {SKILL_GROUP_LABELS[group as SkillNode["group"]]}:{" "}
            {nodes.map((n) => n.label).join(", ")}
          </li>
        ))}
      </ul>

      <h2>Projects</h2>
      <ul>
        {mainQuests.map((q) => (
          <li key={q.id}>
            <h3>{q.title}</h3>
            <p>{q.description}</p>
            {q.liveUrl && <a href={q.liveUrl}>{q.liveLabel ?? "Live"}</a>}
            {q.repoUrl && <a href={q.repoUrl}>Source</a>}
            <p>{q.tags.join(", ")}</p>
          </li>
        ))}
      </ul>

      {sideQuests.length > 0 && (
        <>
          <h2>More Projects</h2>
          <ul>
            {sideQuests.map((q) => (
              <li key={q.id}>
                <h3>{q.title}</h3>
                <p>{q.description}</p>
                {q.liveUrl && <a href={q.liveUrl}>{q.liveLabel ?? "Live"}</a>}
                {q.repoUrl && <a href={q.repoUrl}>Source</a>}
                <p>{q.tags.join(", ")}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Experience</h2>
      <ul>
        {experience.map((e, i) => (
          <li key={i}>
            <h3>
              {e.role} — {e.org}
            </h3>
            <p>
              {e.start}–{e.end} · {e.location}
            </p>
            <ul>
              {e.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
