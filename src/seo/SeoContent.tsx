import { profile } from "@/data/profile";
import { mainQuests } from "@/data/quests";
import { experience } from "@/data/experience";

/**
 * Always-rendered, visually-hidden content so crawlers, no-JS visitors and
 * screen readers get the real substance even though the OS UI loads it lazily.
 */
export default function SeoContent() {
  return (
    <div className="sr-only">
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
