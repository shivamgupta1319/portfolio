# Resume v2 — Metric-Driven Rewrite

> Goal: survive the 6-second recruiter scan + the ATS keyword filter, and signal
> **senior-level impact** for unicorn / product-startup / GCC roles. Your v1 is strong on
> substance but under-quantified and dense at the top. This fixes both.
>
> **IMPORTANT on metrics:** I've inserted `[X]`-style placeholders where a number belongs.
> **Fill every one with a real, defensible figure** — never invent numbers you can't defend
> in an interview. If you truly don't have a metric, use scope words ("multi-tenant",
> "production", "real-time") instead of a fake number. A metric you can't back up in the
> interview is worse than no metric.

---

## 1. Professional summary (rewrite — lead with impact)

**Current problem:** 5 lines, no numbers, buries the lede.

**New version (tighten to 3 lines, front-load proof):**

> Full-Stack Software Engineer, 4+ years, who **ships products end-to-end** — 3 live
> SaaS products (pSEO.cloud, Resite.live, a Shopify App Store app) and 2 published npm
> packages. Core engineer on a **deployed disaster-response platform** (WebRTC/Mediasoup
> with offline-first edge↔cloud sync) and builder of production **fintech, LLM-agent, and
> algorithmic-trading** systems. Strong across React/Next.js, Node/NestJS, Python/FastAPI,
> PostgreSQL, Docker, and LLM/agent architecture. Represented the company at ATR Open
> House 2025, Kyoto.

Why this wins: "ships products end-to-end" + concrete product count in the first sentence
is the single strongest differentiator you have. Most candidates can't say it.

---

## 2. Experience bullets (add credible metrics)

Rewrite each bullet as **[Action] → [Tech] → [Quantified impact]**. Fill the `[X]`s.

**Full-Stack Software Engineer — Wisflux Tech Labs · Jun 2022 – Present**

- Core engineer on **X-FACE / LACS**, a deployed disaster-response comms platform —
  multimodal voice/video/text over WebRTC/Mediasoup serving **40+ concurrent users per node
  across 25–30 deployed field systems**, with on-device ASR/TTS and offline-first edge↔cloud
  PostgreSQL sync that keeps nodes **fully operational with zero internet dependency**;
  showcased at ATR Open House 2025, Kyoto.
- Built **GIBP**, a multi-tenant fintech/accounting platform on a NestJS API integrated
  with the Formance financial ledger — organizations, bills, vendors, reconciliation across
  **4 tenant organizations**, with company + super-admin React portals and **end-to-end
  Playwright coverage on critical financial flows**.
- Contributed to **Emmple (Typezap)**, a live ed-tech platform serving **2,000+ students**
  across web + WhatsApp over ~2 years in production.
- Architected modular backend services (JWT auth, RBAC, API versioning) that **cut API
  response latency by up to 30%**, standardizing a reusable auth layer across every app I
  built (company + personal products).
- Dockerized dev + prod environments and built CI/CD pipelines that **cut deploy time from
  hours to 5–10 minutes** and streamlined new-dev onboarding.
- Published **StreamVerse**, an open-source npm WebRTC SDK (audio/video/screen-share with
  Mediasoup SFU) — **500+ downloads**.

> Tip: Even rough, honest ranges ("~2k students", "~50 weekly downloads") beat blanks. Pull
> real numbers from npm stats, GitHub insights, your DB, and analytics before finalizing.

---

## 3. Key projects (keep, but each gets one metric)

For each of pSEO, Resite, StockSafe, UACE, SmartTrader, Glacier Dev, Echo — add **one**
number or scale marker. Examples:

- **pSEO Engine:** "...generates + quality-gates penalty-resistant SEO pages with pgvector
  semantic dedup (**100+ pages** generated in testing, including live comparison pages
  powering its own deployment); multi-LLM router (OpenRouter/NVIDIA/Gemini) with automatic
  failover — **no user-visible outages**, provider rate limits absorbed by multi-provider
  fallback."
- **UACE:** "...published to npm (**1,500+ downloads**); 14+ MCP tools with offline semantic
  search across entire codebases."
- **SmartTrader:** "...backtests **28+ documented strategies** across the **full NSE universe
  (~2,000 symbols)**, streaming a live scanner over WebSockets with sub-second latency."

You already have great scale words baked into these — just surface the numbers.

---

## 4. ATS keyword coverage (target-role scan)

Make sure these appear verbatim somewhere (skills or bullets). Unicorns/GCCs ATS-filter on
exact terms. You already have most — the ones worth confirming:

**Core:** System Design, Distributed Systems, Microservices, REST API, GraphQL,
Event-Driven, Message Queue (Kafka/BullMQ/pg-boss), Caching (Redis), Scalability,
High Availability, Observability, CI/CD, Docker, Kubernetes*, AWS*, Postgres, SQL.

**Your edge:** WebRTC, LLM, RAG, Vector Database (pgvector/Qdrant), Model Context Protocol,
Agent Orchestration, Multi-Tenant, Real-Time.

\* **Kubernetes / AWS / Kafka** — if you have *any* real exposure, list it; these are the
three most common GCC/unicorn ATS filters you may currently be missing. If you don't,
consider a weekend project to earn them honestly (see DSA plan Month 2–3 slack time).

---

## 5. Formatting checklist (keep ATS-safe)
- Single column, no tables/text-boxes/images for the parts ATS reads (your PDF is fine).
- Standard section headings: Summary, Skills, Experience, Projects, Education.
- Save as PDF **and** keep a `.docx` (some ATS parse docx better) — you already have both.
- File name: `Shivam_Gupta_SDE_Resume.pdf` (role keyword in filename helps some recruiters).
- 2 pages is fine for your depth — don't cram to 1.

---

## Next action
Fill every `[X]` with a real number this week, then I can regenerate the actual PDF/DOCX
content (`public/resume/`) to match, if you want the live resume updated too.
