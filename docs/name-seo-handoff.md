# Name-Search SEO — Handoff (resume here tomorrow)

**Status:** Planned + inputs gathered. **No code written yet.** Next session = execute.
**Date paused:** 2026-07-12. **Approved plan file:** `~/.claude/plans/glowing-coalescing-crayon.md`

---

## The one-line context

Goal: rank on Google for the name **"Shivam Gupta"** + eventually earn a Knowledge
Panel, to support the 6-month job switch. Trigger: checked Wikipedia, no "Shivam Gupta"
article, asked if he can self-publish one.

**Honest verdict (don't relitigate):** ❌ Wikipedia autobiographies of non-notable
people get deleted, and the public deletion log is a *worse* Google result than none.
Wikipedia proper is OUT. We pursue (A) **Wikidata** (lenient but still needs
references) and (B) **on-site structured-data tightening**.

---

## Inputs collected (ready to wire — no re-asking needed)

| Field | Value | URL to emit | Verified |
|---|---|---|---|
| npm | `shivamgupta1319` | `https://www.npmjs.com/~shivamgupta1319` | 403 to curl (bot-block) — **eyeball in browser** |
| dev.to | `shivamgupta1319` | `https://dev.to/shivamgupta1319` | ✅ 200 |
| X/Twitter | `sg247938` | `https://x.com/sg247938` | ✅ 200 |
| Headshot | `Pi7_Passport_Photo (3).jpeg` (repo root, 413×531) | → move to `public/shivam-gupta.jpg` | present ✅ |

**Photo notes:** serviceable passport-style headshot (front-facing, neutral, light bg).
Can't do real professional retouching here (needs a photo tool/photographer). Plan:
move + rename to `public/shivam-gupta.jpg`, apply light ffmpeg clean-up (sharpen +
contrast; `convert`/`magick` NOT installed, `ffmpeg` IS). It's small (413px) — Google
prefers ~1000px long side, but no upscale will add real detail; fine for now.

**Still to create later (leave fields empty/filtered-out until then):** ORCID,
Crunchbase, Hashnode. These come from the Track A doc's prerequisite list.

---

## Track A — Wikidata guidance doc (deliverable, NOT auto-published)

Create **`docs/career/wikidata-and-name-seo.md`** — a runbook Shivam executes himself
(needs his own account + factual review; I do NOT create the item for him). Sections:
1. **Why not Wikipedia** — WP:NPEOPLE notability, WP:AUTO/COI, deletion-log backfire.
2. **Prerequisite referenceable profiles** (do first; double as `sameAs` targets):
   ORCID (free/instant, P496), Crunchbase (founder of pseo.cloud + resite.live),
   dev.to/Hashnode, GitHub (have), npm (have, 2 packages).
3. **Create the Wikidata item** — label "Shivam Gupta", desc "Indian software
   engineer", `instance of` human (Q5), `occupation` software engineer, sex/gender,
   `country of citizenship` India, + **external-id statements** (ORCID, GitHub username,
   official website = shivamgupta.live). The external IDs *are* the references that keep
   it alive.
4. **Honest expectations** — may still be flagged for a non-notable living person; keep
   factual + identifier-heavy, never promotional. Feeds (≠ guarantees) a Knowledge Panel.
5. **Real long game** — independent citations (talk, podcast, press, SO rep) make both
   Wikidata and a future Wikipedia page defensible.

---

## Track B — Portfolio structured-data changes (code)

Files + exact edits. All small, one commit each is fine.

1. **`src/data/types.ts`** — extend `Profile` interface with optional fields:
   `npm?`, `devto?`, `twitter?` (handle), `twitterUrl?`, `photo?`, plus placeholders
   `wikidata?`, `orcid?`, `crunchbase?`.
2. **`src/data/profile.ts`** — fill: `npm: "shivamgupta1319"`,
   `devto: "https://dev.to/shivamgupta1319"`, `twitter: "sg247938"`,
   `photo: "/shivam-gupta.jpg"`. Leave wikidata/orcid/crunchbase as `""` (empty).
3. **`src/seo/JsonLd.tsx`** ([current state](../../src/seo/JsonLd.tsx)):
   - `sameAs` (line 40): build from `[github, linkedin, npm-url, devto, twitter-url,
     wikidata, orcid, crunchbase].filter(Boolean)` so empties never emit.
   - `image` (line 34): replace OG-card string with an `ImageObject`
     (`{"@type":"ImageObject", url: SITE_URL+profile.photo, caption: profile.name}`)
     when `profile.photo` set, else keep OG fallback.
   - Add `worksFor` (current `experience` entry where `kind==="work"` → `Organization`
     name "Wisflux Tech Labs") and `alumniOf` (`kind==="education"` → "Anand
     International College of Engineering"). Data already in `src/data/experience.ts`.
   - Add `dateModified` to the ProfilePage node (build-time ISO date). NOTE:
     `Date.now()`/`new Date()` are fine in app code (only banned in workflow scripts).
4. **`src/app/sitemap.ts`** — add `/resume/Shivam_Gupta_Resume.pdf` entry + `lastModified`
   on both entries.
5. **`src/app/layout.tsx`** — add `openGraph.locale: "en_US"`; add
   `twitter.creator: "@sg247938"` (+ `site` same). Optionally explicit OG `images`.
6. **`docs/seo-action-plan.md`** — the LinkedIn mismatch note is STALE: memory
   `seo-domain-setup` confirms `linkedin.com/in/myselfshivam` is correct. Mark resolved.

---

## Verification (after coding)

- `npm run build` succeeds (it's a static export → `out/`).
- Grep `out/` for the new `sameAs` URLs + `ImageObject` + `worksFor` to confirm they're
  server-rendered (crawler-visible, not JS-gated).
- Paste built homepage HTML into **Google Rich Results Test** + **Schema Markup
  Validator** — Person/WebSite/ProfilePage parse clean, image resolves.
- Confirm `public/shivam-gupta.jpg` serves at `https://shivamgupta.live/shivam-gupta.jpg`.

---

## Resume-tomorrow checklist

- [ ] Verify npm profile loads in a browser (curl was 403-blocked).
- [ ] Track A: write `docs/career/wikidata-and-name-seo.md`.
- [ ] Track B #1–6 above (code).
- [ ] Move/clean photo → `public/shivam-gupta.jpg` (ffmpeg).
- [ ] Build + validate structured data.
- [ ] Commit (Conventional Commits, likely `feat(seo): expand Person entity — sameAs,
      photo, worksFor/alumniOf`).
- [ ] Remove `Pi7_Passport_Photo (3).jpeg` from repo root once moved.
