# Behavioral Story Bank (STAR)

> Behavioral rounds ("Tell me about a time...") are pass/fail gates at unicorns and GCCs —
> especially GCCs (Amazon-style bar-raiser rounds test Leadership Principles hard). You have
> rich raw material; the job is to **pre-structure 6–8 stories** so you never fumble.
>
> **STAR = Situation · Task · Action · Result.** Keep each to ~90 seconds. Always end with a
> **quantified result** and a **one-line "what I learned."** Fill the `[X]` metrics with real
> numbers.
>
> **Reuse trick:** one strong story can answer many prompts. Master these 8 and you can
> handle ~90% of behavioral questions.

---

## Story 1 — Ownership / shipping under ambiguity
**Source: LACS / X-FACE disaster-response platform**
- **S:** We had to build comms for front-line teams that work through intermittent/no connectivity — a hard, ambiguous problem with real stakes.
- **T:** I was core engineer responsible for the sync + real-time comms layer.
- **A:** Designed offline-first architecture with bidirectional edge↔cloud PostgreSQL sync so local nodes stay operational, integrated Mediasoup WebRTC for multimodal comms, and built one-touch provisioning for field mini-PCs.
- **R:** Deployed across **25–30 field systems serving 40+ users each**, fully operational offline with **zero internet dependency**; showcased internationally at ATR Open House 2025, Kyoto.
- **Learned:** Designing for failure-first (assume the network is gone) produces more robust systems than bolting on offline support later.

*Answers: "biggest project", "ownership", "ambiguity", "hardest technical problem", "proud of".*

---

## Story 2 — Shipping a product 0→1 (entrepreneurial drive)
**Source: pSEO.cloud (or Resite / StockSafe)**
- **S:** Saw a real gap — programmatic SEO tools produce thin, penalty-prone pages.
- **T:** Build a developer-first SaaS that generates *quality-gated*, penalty-resistant pages, entirely solo.
- **A:** Built Next.js 15 + Drizzle + pgvector dedup, a multi-LLM router with automatic failover + JSON repair, self-hosted auth, and Lemon Squeezy billing as merchant of record.
- **R:** Shipped **live at pseo.cloud** (early stage) — **100+ quality-gated pages** generated in testing, including live comparison pages powering its own deployment; a complete product built solo end-to-end — billing, auth, infra, and generation pipeline.
- **Learned:** Shipping end-to-end (billing, auth, infra, not just features) is a different muscle than closing tickets — and it's the one that compounds.

*Answers: "went above and beyond", "self-starter", "product sense", "outside of work".*

---

## Story 3 — Resilience / handling a failing dependency
**Source: pSEO multi-LLM router**
- **S:** LLM providers are flaky — rate limits, downtime, malformed JSON — and my product depended on them.
- **T:** Make generation reliable despite unreliable upstreams.
- **A:** Built a multi-provider router (OpenRouter/NVIDIA/Gemini) with automatic failover, retries, and a JSON-repair layer; queued work through pg-boss for back-pressure.
- **R:** **No user-visible outages** despite providers hitting free-tier rate limits — absorbed by multi-provider failover with retries + JSON repair.
- **Learned:** Treat every external dependency as guaranteed-to-fail; design the failover before the happy path.

*Answers: "handled a system failure", "technical challenge", "reliability", "tradeoff".*

---

## Story 4 — Working on a team / production quality bar
**Source: GIBP multi-tenant fintech platform**
- **S:** Building a multi-tenant accounting platform on the Formance ledger where correctness is non-negotiable (real money movements).
- **T:** Deliver reconciliation, bills, vendors across tenants with high confidence.
- **A:** Built the NestJS API + role-based access, and drove **end-to-end Playwright coverage on critical financial flows**; collaborated with the team on migrations and the admin portals.
- **R:** Shipped a production **multi-tenant fintech platform (4 tenant organizations)** with full audit + RBAC; the E2E suite caught regressions on money-movement flows before release.
- **Learned:** In fintech, tests aren't overhead — they're the thing that lets you move fast without breaking trust.

*Answers: "working in a team", "quality/testing", "collaboration", "attention to detail".*

---

## Story 5 — Learning something hard, fast
**Source: crypto-ai / DRL trading / algo systems**
- **S:** Wanted to build genuinely robust trading systems, which required quant methods I didn't know.
- **T:** Learn walk-forward, Monte-Carlo robustness testing, meta-labeling, and RL (PPO/A2C/SAC) well enough to build with them.
- **A:** Self-taught the statistics + built a 12-strategy engine with scikit-learn meta-label filters and a custom Gymnasium environment modeling real NSE costs (STT, slippage, stamp duty).
- **R:** Built a working research + paper-trading system across **28 strategies** with realistic cost modeling.
- **Learned:** I can go from zero to production in an unfamiliar domain by building the smallest real thing first, then hardening it.

*Answers: "learned something new", "outside comfort zone", "self-taught", "curiosity".*

---

## Story 6 — Failure / mistake & recovery
**Source: pick a real one — e.g., an early architecture you had to redo, a prod bug**
- **S:** [A time something you built broke or an approach didn't scale — be honest and specific.]
- **T:** [What you had to fix.]
- **A:** [What you changed — root-cause it, don't just patch.]
- **R:** [Outcome + what you put in place so it can't recur.]
- **Learned:** [The systemic lesson.]

> **Action item:** you MUST have a genuine failure story. Interviewers smell a fake "my
> weakness is I work too hard." Pick a real one — a rewrite, an outage, a wrong bet — and
> frame it around what you *changed systemically*. Write it out this week.

*Answers: "biggest failure", "a mistake", "disagreed with a decision", "constructive feedback".*

---

## Story 7 — Simplifying / open-source impact
**Source: UACE / StreamVerse (published npm packages)**
- **S:** [UACE] AI coding assistants lose all context between sessions — a real, repeated pain.
- **T:** Give any assistant a shared, local-first "project brain."
- **A:** Built + published an MCP server (14+ tools, offline semantic search via sqlite-vec, git ingestion, file-watch) plus a VS Code extension.
- **R:** Published to npm (**1,500+ downloads**); used across Claude Code / Cursor / Copilot.
- **Learned:** The highest-leverage engineering is often removing a recurring friction for many people, not a feature for one.

*Answers: "impact beyond your team", "open source", "initiative", "simplify".*

---

## Story 8 — Why leaving / why this company (the honest reframe)
> You'll be asked "why are you looking?" Do NOT badmouth your current company or mention pay
> first. Frame around **growth and scale**:
- **Say:** "I've shipped a lot end-to-end at a small startup — 3 live products, real
  production systems. I want to now work on **larger-scale systems with a strong engineering
  team I can learn from**, and [company] is exactly that environment."
- If pushed on comp: "Compensation is part of it — I want it aligned with market and my
  impact — but the main driver is scale and growth."

*Answers: "why are you looking", "why us", "where do you see yourself".*

---

## Delivery checklist
- [ ] Each story ≤ 90 seconds, ends with a number.
- [ ] Story 6 (failure) is real and written out.
- [ ] Every `[X]` filled with a defensible metric.
- [ ] Practice out loud 2× before first interview (record yourself once).
- [ ] For GCCs (esp. Amazon-style): map each story to a Leadership Principle
      (Ownership, Dive Deep, Bias for Action, Deliver Results, Learn & Be Curious).
