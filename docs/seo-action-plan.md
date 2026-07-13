# SEO Action Plan — ranking for "Shivam Gupta"

The portfolio's **on-page/technical SEO is done in code** (rich metadata, OG image,
sitemap, robots, a crawlable hidden-content block, and now JSON-LD `Person`/`WebSite`
structured data + Search Console verification hook). Everything below is the **off-page
work only you can do**, ordered by impact.

> Reality check: "Shivam Gupta" is one of the most common Indian names, so ranking for the
> *bare* name is a slow, entity-building game measured in months. Near-term (weeks) you can
> realistically rank for **"Shivam Gupta portfolio / developer / engineer"** and start
> building toward a Google Knowledge Panel.

---

## 1. Custom domain (highest impact) — mostly done ✅

The `.netlify.app` subdomain can't meaningfully rank for a name; a domain with your name in
it is the single biggest lever. You've bought the domain and wired it into Netlify.

**Remaining step — point the build at it:**

1. Netlify → **Site configuration → Environment variables → Add a variable**
   - Key: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://<your-domain>`  *(no trailing slash)*
2. Netlify → **Deploys → Trigger deploy → Clear cache and deploy site**
   (the URL is baked in at build time, so a redeploy is required).
3. Verify: view source on the live site → `<link rel="canonical">`, `og:url`, and the
   JSON-LD `url` all show the new domain.
4. In Netlify **Domain management**, set the custom domain as **primary** and enable
   **Force HTTPS** so `http://` and `www.` redirect to the canonical `https://` apex.

> Also update the fallback default in `src/lib/site.ts` (`SITE_URL`) to the new domain so
> local builds match production even without the env var.

---

## 2. Google Search Console (do this next)

1. Go to [search.google.com/search-console](https://search.google.com/search-console) →
   **Add property**.
   - Prefer the **Domain** property (verifies the whole domain) → verify via a **DNS TXT
     record** at your registrar/Netlify DNS. *(Recommended now that you own the domain.)*
   - Or use a **URL-prefix** property and the **HTML tag** method: copy the token, set it as
     `NEXT_PUBLIC_GOOGLE_VERIFICATION` in Netlify env, redeploy — the site already renders
     `<meta name="google-site-verification">` from that variable.
2. Once verified: **Sitemaps** → submit `sitemap.xml`.
3. **URL Inspection** → paste the homepage URL → **Request indexing**.
4. **URL Inspection → Test live URL → View crawled page** → confirm Google sees the rendered
   text and the structured data.
5. Repeat on **[Bing Webmaster Tools](https://www.bing.com/webmasters)** (you can import
   directly from Search Console).

---

## 3. Structured data check

After the domain redeploy, validate the JSON-LD:
- [Rich Results Test](https://search.google.com/test/rich-results) — paste the live URL.
- [Schema Markup Validator](https://validator.schema.org/) — confirm `Person`, `WebSite`,
  and `ProfilePage` parse with no errors.

---

## 4. Profile consistency (entity signals)

Google merges your web presence into one "Shivam Gupta" entity only when the signals agree.
Make the **name, headline, and website link identical** everywhere:

- **LinkedIn** → Contact info → set Website = the new domain. Keep the headline aligned with
  "Full-Stack Software Engineer".
- **GitHub** → profile + profile README → add the domain as your website/blog link.
- **Email signature** and the **resume PDF** → use the new domain.
- ✅ **LinkedIn URL — RESOLVED (2026-07-13):** `linkedin.com/in/myselfshivam` is the correct,
  live vanity URL (confirmed; matches the README badge). No change needed in `profile.ts`;
  the `sameAs` link is valid.

---

## 5. Backlinks

`sameAs` + inbound links are what let Google connect the profiles into one entity and trust
the site. Ensure each of these **links back to the domain**:

- GitHub profile, LinkedIn, and any dev-community profiles (dev.to, Hashnode, Stack Overflow)
  you create later.
- A pinned GitHub repo / README linking to the portfolio.
- Any guest posts, project pages, or directories where you can add your site.

---

## 6. Expectations & timeline

| Query | Realistic timeframe |
|---|---|
| `shivamgupta.<tld>` (exact domain) | Days, after indexing |
| "Shivam Gupta portfolio / developer / engineer" | 2–6 weeks |
| Bare "Shivam Gupta" (page 1) | Months — gated by domain age, backlinks, and competing namesakes |
| Knowledge Panel | Longest — needs strong, consistent entity signals over time |

**Fastest wins:** finish steps 1–2 today (env var + redeploy + Search Console + request
indexing), then step 4 (profile consistency). Those three do most of the work.
