# Wikidata & Name-Search SEO — Runbook

**You execute this yourself.** It needs your own accounts and your factual review — I
don't create the Wikidata item or the external profiles for you. This is the step-by-step
so you don't have to re-derive it.

Goal: rank on Google for the name **"Shivam Gupta"** and become eligible for a Knowledge
Panel, supporting the 6-month job switch.

---

## 1. Why not Wikipedia (settle this once)

- **WP:NPEOPLE notability** — a Wikipedia article needs *significant coverage in multiple
  independent, reliable secondary sources* (press, books, major media). A working engineer
  without that coverage does not qualify yet.
- **WP:AUTO / WP:COI** — autobiographies and self-written articles are strongly discouraged
  and get scrutinized hard.
- **Deletion-log backfire** — a deleted article leaves a public deletion-log page that
  Google *can* index. That is a **worse** search result than having nothing. Do not risk it.

**Verdict:** Wikipedia proper is OUT until independent coverage exists (see §5). Pursue
Wikidata + on-site structured data instead — both are already lenient and defensible.

---

## 2. Prerequisite referenceable profiles (do these FIRST)

These double as `sameAs` targets on the site *and* as the external-ID references that keep a
Wikidata item alive. Create the ones you don't have, then tell me the URLs so I can wire the
empty placeholders in `profile.ts` (`wikidata`, `orcid`, `crunchbase`).

| Profile | Why it matters | Wikidata property | Status |
|---|---|---|---|
| **GitHub** — `shivamgupta1319` | Primary dev identity | P2037 (GitHub username) | ✅ have |
| **npm** — `shivamgupta1319` | 2 published packages = real output | (via official website / sameAs) | ✅ have |
| **dev.to** — `shivamgupta1319` | Authored technical content | (sameAs) | ✅ have |
| **X/Twitter** — `sg247938` | Social identity | P2002 (Twitter username) | ✅ have |
| **ORCID** | Free, instant, a strong scholarly identifier | P496 (ORCID iD) | ⬜ create |
| **Crunchbase** | Founder of pseo.cloud + resite.live → legitimizes "founder" | P2088 (Crunchbase person) | ⬜ create |
| **Hashnode** (optional) | More authored content, another sameAs | (sameAs) | ⬜ optional |

**ORCID** — https://orcid.org/register. Free, ~2 minutes, issues an iD immediately. This is
the single highest-leverage prerequisite: it's a globally recognized person identifier that
Wikidata accepts as a first-class statement.

**Crunchbase** — add yourself as a Person, then link the companies/products you founded
(pseo.cloud, resite.live). Keep it factual, not promotional.

---

## 3. Create the Wikidata item

Once ORCID (at minimum) exists:

1. Log in at https://www.wikidata.org (create a free account) and click **Create a new Item**.
2. **Label:** `Shivam Gupta` · **Description:** `Indian software engineer` ·
   **Aliases:** your handle(s).
3. Add these statements:
   - `instance of` (P31) → **human** (Q5)
   - `occupation` (P106) → **software engineer** (Q188113)
   - `sex or gender` (P21) → **male** (Q6581097)
   - `country of citizenship` (P27) → **India** (Q668)
   - `official website` (P856) → `https://shivamgupta.live`
   - `educated at` (P69) → Anand International College of Engineering (if it has a Q-item;
     skip if not — don't invent one)
   - `employer` (P108) → Wisflux Tech Labs (same caveat)
4. Add the **external-id statements** — *these are the references that keep the item alive*:
   - `ORCID iD` (P496)
   - `GitHub username` (P2037) → `shivamgupta1319`
   - `Twitter username` (P2002) → `sg247938`
   - `Crunchbase person ID` (P2088) → once created

The `official website` + external IDs cross-reference the exact same identities emitted in
the site's `sameAs` block — that mutual reinforcement is what search engines read as "this is
one real, consistent person."

---

## 4. Honest expectations

- A Wikidata item for a **non-notable living person** *can* still be flagged or merged. Keep
  it strictly **factual and identifier-heavy, never promotional** — that's what survives.
- Wikidata **feeds** a Knowledge Panel; it does not **guarantee** one. Google decides.
- Timeline: indexing + entity consolidation takes weeks, not days. Don't expect same-week
  results.

---

## 5. The real long game (what actually makes both defensible)

Independent, third-party citations are the only thing that ultimately unlocks a Wikipedia
article *and* hardens the Wikidata item:

- A **conference talk / meetup** with a public listing.
- A **podcast** appearance or **guest post** on an established publication.
- **Press** coverage of pseo.cloud / resite.live (a product launch, a Product Hunt feature).
- Sustained **Stack Overflow** reputation or notable open-source contributions.

Each of these is an independent source you don't control — exactly what notability requires.
Collect them over the 6-month window; revisit Wikipedia only once two or three exist.

---

## After you finish

Send me: your **ORCID iD**, **Crunchbase person URL**, and **Wikidata Q-ID**. I'll drop them
into `profile.ts` (the `orcid`, `crunchbase`, `wikidata` fields are already stubbed as empty
strings and filtered out of `sameAs` until then) so the site emits them the moment they exist.
