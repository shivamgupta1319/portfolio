# 08 — Project Grilling & Honest Gaps

> **The round that decides the offer.** Files 01–07 prove you're competent; this one proves
> you're *senior*. The difference an interviewer is listening for is whether you made
> decisions or just used defaults — so every answer here has a **why**, an **alternative you
> rejected**, and a **cost you accepted**.
>
> ⚠️ **Before using this file:** every number you say must be one you can defend under
> follow-up. Where a metric is marked `[verify]`, confirm it from npm stats, GitHub insights,
> your database or analytics before you use it. An unbackable number is worse than no number —
> see the warning at the top of [resume-v2.md](../resume-v2.md).

---

## The universal answer shape

Every "tell me about a project" answer follows the same 90-second structure:

1. **What problem** (1 line — the user's problem, not the tech)
2. **What I built** (1 line)
3. **The hard part** (2–3 lines — this is what you're actually being asked)
4. **A decision and its tradeoff** (2 lines)
5. **Outcome + a hook** (1 line that invites the follow-up you want)

The **hook** is the technique to practise. End on something you *want* to be asked about, and
you steer the round onto your strongest ground.

---

## LACS / X-FACE — disaster-response platform

*Your flagship. Deployed, international, and technically hard on two axes at once.*

**Q. Walk me through LACS.**

> Front-line disaster-response teams need to coordinate in places where connectivity is
> intermittent or absent — which breaks every normal assumption about a comms app. We built a
> platform with multimodal voice, video and text over Mediasoup WebRTC, on-device speech
> recognition and TTS, SOS signalling and GIS mapping, running on mini-PC field hardware.
>
> The hard part wasn't the comms, it was the **offline-first architecture**. Each field node
> runs a full local stack — its own Postgres, its own SFU — so a node stays completely
> functional with zero internet. When connectivity returns, edge and cloud reconcile
> bidirectionally. I was core engineer on the sync and real-time layers.
>
> It's deployed across field systems and we showed it at ATR Open House 2025 in Kyoto.
>
> *Hook:* "The sync design is the interesting part if you want to go into it."

---

**Q. How does the edge↔cloud sync actually work?**

> Every record carries a logical timestamp and an originating node ID, and each node keeps a
> change log of what it hasn't yet shipped. On reconnect the two sides exchange changes since
> their last acknowledged watermark, apply them, and advance the watermark — so an interrupted
> sync resumes rather than restarts, which matters when the connection window is short and
> unreliable.
>
> Conflict resolution is per-entity by design rather than one global rule. Most records are
> append-only — messages, events, location pings — so they simply merge with no conflict
> possible. For mutable records we use last-write-wins on the logical timestamp, and for the
> few where losing a write is unacceptable, both versions are retained and surfaced for a human
> to resolve. That's the honest answer: you don't solve conflicts generically, you *design them
> out* for most of your data and handle the remainder explicitly.

↳ **If pushed:** they may ask about CRDTs. Say you considered them, that they're the right tool
  when arbitrary concurrent editing must converge automatically, and that they were more
  machinery than this data model needed — append-only plus per-entity rules got the same
  guarantee with far less complexity.

---

**Q. What was the hardest bug or constraint?**

> The constraint that shaped everything was that the target hardware is a small mini-PC with
> limited CPU, and media handling is CPU-bound. That drove real decisions: hardware-accelerated
> H.264 rather than a better-compressing codec that would have cost more CPU, hard container
> resource limits so one service couldn't starve the others, and aggressive log rotation because
> a full disk on an unattended device in the field is unrecoverable without someone physically
> there.
>
> The general lesson: on edge hardware, the failure you have to design for isn't the one you'd
> get an alert about — nobody is going to SSH in and fix it.

---

**Q. How would you scale it to 10× the deployments?**

> The node architecture already scales horizontally by construction — each node is independent
> and self-sufficient, so ten times the nodes is ten times the nodes. The pressure lands on
> the cloud side: sync throughput, fleet provisioning, and observability across devices you
> can't reach.
>
> So: partition the cloud sync by node so it shards cleanly; move provisioning from one-touch
> to fully declarative so a new device configures itself from a manifest; and add fleet
> telemetry with staged rollouts, because pushing a bad update to every field device
> simultaneously is the actual catastrophic risk at that scale — much more than load.

---

## pSEO Engine — programmatic SEO SaaS

**Q. Tell me about pSEO.**

> Programmatic SEO tools generate pages at scale, and search engines penalise thin,
> near-duplicate content — so the tool that helps you scale is also the tool that gets you
> penalised. pSEO generates pages and then *quality-gates* them: pgvector semantic dedup so
> near-identical pages never ship, plus thin-content guardrails. Output goes into the
> customer's own Next.js or Astro repo as a GitHub PR, so they review it and own the code —
> rather than us hosting it on a subdomain, which is what most competitors do and is worse for
> SEO.
>
> Built solo end-to-end: Next.js 15, Drizzle, Postgres with pgvector, self-hosted auth,
> pg-boss for the generation queue, Lemon Squeezy as merchant of record for billing.

---

**Q. Why the multi-LLM router?**

> Because the product's core operation depended on a third party that fails routinely — rate
> limits, downtime, and malformed JSON responses. A single-provider integration meant every
> provider incident was a product outage.
>
> So the router abstracts the provider, and requests fail over across OpenRouter, NVIDIA and
> Gemini with backoff. Structured output is validated against a schema; on failure it tries
> deterministic repair first — most failures are formatting, like markdown fences around the
> JSON — and only retries the model if repair fails. Everything runs through a pg-boss queue,
> so a burst is absorbed rather than hammering a rate limit.
>
> *Hook:* "It's basically a circuit-breaker pattern applied to LLM providers, if you want the
> details."

↳ **This maps directly to the classic question** "design a system resilient to a flaky
  third-party API" — use it there.

---

**Q. Why pgvector rather than a dedicated vector DB?**

> Because the dedup query needs to filter by project and status at the same time as it does
> similarity search, and with pgvector that's one SQL query against data that's already
> transactionally consistent with the page records. With a separate vector database I'd have two
> systems to keep in sync, two failure modes, and a consistency gap between a page and its
> embedding. At the scale this operates at, that complexity buys nothing. I'd revisit it if the
> vector count grew by orders of magnitude.

---

## Resite — AI résumé platform

**Q. What's the architecture?**

> Next.js 15 frontend, NestJS API, Postgres, BullMQ on Redis for the async work, and Puppeteer
> for PDF rendering.
>
> The design decision worth talking about is that both résumé parsing and PDF rendering are
> queued, not synchronous. Puppeteer spins up a headless Chromium — it's slow and memory-hungry,
> and doing it in the request would tie up a worker for seconds and fall over under any
> concurrency. Queuing it means the API responds immediately, the render tier scales
> independently, and a crashed render retries instead of returning a 500. The cost is that the
> UI has to handle an asynchronous result, which is a real UX cost I accepted deliberately.

---

**Q. How does subdomain portfolio hosting work?**

> Wildcard DNS points every subdomain at the app; middleware reads the host header, resolves
> the subdomain to a tenant, and rewrites to the internal route for that portfolio. Reserved
> subdomains are blocklisted so nobody claims `www` or `api`, and tenant resolution feeds a
> request-scoped context that every query is scoped by.
>
> *Hook:* "The interesting part is tenant isolation — how you guarantee one user's data can
> never render on another's subdomain."

🔗 Multi-tenant isolation depth is in [07-specialities.md](07-specialities.md).

---

## StockSafe Bundles — live on the Shopify App Store

*Use this one when asked about shipping to real users, or working within someone else's platform.*

**Q. What does it do and why is it hard?**

> Shopify merchants sell fixed bundles, and bundle inventory is genuinely hard to keep correct
> across multiple locations — a bundle's sellable quantity is constrained by its scarcest
> component *at that location*, and when a bundle reads zero the merchant has no idea which
> component caused it.
>
> So it's a reconcile → diagnose → audit engine: compute true per-location sellable quantity,
> name the bottleneck component, and keep an append-only audit trail — which no incumbent had,
> and which is what merchants actually asked for, because inventory disputes are
> after-the-fact arguments about what changed.
>
> The constraints that shaped it were platform ones: Shopify's API rate limits, and webhooks
> that are at-least-once and can arrive out of order — so every handler is idempotent and
> reconciliation is derived from current state rather than assuming an event sequence.

↳ **Strong signal:** shipping through a third-party app review process is evidence of
  end-to-end ownership that most candidates don't have.

---

## UACE — published MCP server

**Q. Why did you build it?**

> Every AI coding assistant loses all project context between sessions, so you re-explain the
> same codebase repeatedly. UACE gives them a shared, local-first "project brain" — an MCP
> server with 14+ tools, offline semantic search over the codebase using sqlite-vec with local
> embeddings, git ingestion and live file-watching, plus a VS Code extension.
>
> Local-first was the deliberate choice: no code leaves the machine, which makes it usable in
> environments where a cloud indexing service would be immediately disqualified. The tradeoff
> is that embeddings run locally, so I'm using smaller models than a hosted service would.
>
> Published to npm — `[verify]` current download count before quoting it.

---

**Q. What did building it teach you?**

> That tool design is the whole game. Renaming a tool and rewriting its description changed the
> model's behaviour more than swapping models did. And that context is the scarce resource — my
> first version returned large result blobs, which crowded out everything else and made the
> assistant *worse*. Returning focused summaries with a way to drill in was strictly better.
> It's the same instinct as API design: the caller's attention is finite, so return what's
> needed, not what's available.

---

## StreamVerse — published WebRTC SDK

**Q. Why does it exist?**

> WebRTC's API surface is large and the signalling layer is entirely on you, so a video call
> that should be a small feature turns into a week. StreamVerse reduces it to a few lines —
> video calls, live streaming and screen share — with automatic P2P→SFU escalation, so small
> calls stay peer-to-peer and cost nothing while larger ones transparently move to a Mediasoup
> SFU.
>
> That escalation is the design decision: mesh P2P is O(N²) connections and collapses past a
> few participants, but spinning up an SFU for a 1:1 call is waste. Detecting the threshold and
> switching gives you both.

---

## CopyTrade Pro — trade execution pipeline

*Best answer for reliability, idempotency and "what happens when it goes wrong".*

**Q. How do you make trade execution reliable?**

> It's a NestJS API with BullMQ workers ingesting signals, validating them through risk checks,
> and executing on Binance Futures through a CCXT layer.
>
> The requirement that drives everything: the queue is at-least-once, so a worker can place a
> real order and die before marking the job complete — and a redelivery would place a **second
> real position**. So every execution carries a client-supplied idempotency key that the
> exchange also honours, and state transitions are guarded so a job can't move forward twice.
>
> Alongside that, API keys are encrypted at rest with AES-256-GCM — authenticated encryption,
> so tampering is detectable, not just unreadable — and decrypted only in the worker that needs
> them.
>
> *Hook:* "The general problem is exactly-once side effects on an at-least-once queue, which
> isn't solvable — you make the effect idempotent instead."

---

## SmartTrader — real-time market scanner

**Q. Why a polyglot architecture?**

> Because the two halves have genuinely different needs. The quant engine is pandas,
> scikit-learn and technical analysis — Python's ecosystem there has no Node equivalent worth
> fighting. The product surface is a React UI and a NestJS API with Prisma, where TypeScript
> end-to-end gives shared types and better tooling. They talk over HTTP inside an Nx monorepo,
> so shared contracts stay in sync and CI only rebuilds what changed.
>
> The honest cost: two runtimes, two dependency ecosystems, two deployment stories. Worth it
> here because rewriting pandas in Node would have been strictly worse. Not worth it if the
> Python side were only doing arithmetic.

---

**Q. How does the live scanner stream work?**

> WebSocket fan-out to connected clients. The three things that matter: **throttle server-side**
> — the UI can't render more than a few updates per second per symbol regardless of tick rate,
> so aggregate before pushing rather than flooding the socket; **handle reconnection** with a
> sequence number so a client that drops can request what it missed rather than resyncing
> everything; and **backpressure** — a slow client must not be allowed to grow an unbounded
> server-side buffer, so it gets dropped updates rather than the server running out of memory.

---

## GIBP — multi-tenant fintech (team project)

**Q. What was your part, and what did you learn?**

> I built the NestJS API integrated with the Formance financial ledger — organisations,
> accounts, bills, vendors and reconciliation across tenant organisations, with role-based
> access and company plus super-admin React portals. I also drove the end-to-end Playwright
> coverage on the critical financial flows.
>
> What I learned is that in fintech, tests aren't overhead — they're what lets you ship
> quickly. A bug in a reconciliation flow isn't recoverable with an apology and a hotfix; the
> money has moved. So the E2E suite on money-movement paths was the thing that let us make
> changes confidently, and I'd argue for the same bar anywhere correctness is non-negotiable.

↳ **Be precise about team vs solo work.** Say "I built X, the team built Y" — claiming a team
  project as solo is the fastest way to fail a reference check, and being clear about scope
  reads as confident, not modest.

---

## Cross-cutting questions

**Q. Which project are you most proud of, and why?**

> LACS — because it's the one where the constraints were real. It's deployed on hardware in the
> field, used by people whose work matters, with no assumption of connectivity. Building for
> "the network is gone and nobody can come fix this" produces a different quality of thinking
> than building for a datacentre, and it's the project that most changed how I design things.

---

**Q. What would you do differently?**

> On pSEO, I built the generation pipeline before I built the evaluation harness — so early on
> I was tuning prompts by eyeballing outputs, which is superstition, not engineering. Once I
> had a golden set and could actually measure whether a change improved quality, progress got
> much faster and I discovered some earlier "improvements" had done nothing.
>
> The generalised lesson is that for anything non-deterministic, the measurement comes first.
> I now build the eval before the feature.

---

**Q. How do you decide between building and using something off the shelf?**

> Default to off the shelf. I build when the thing *is* the product — pSEO's quality gate is
> the differentiator, so buying it makes no sense — or when every option carries a dependency
> cost I don't want, which is why the WebRTC SDK and the MCP server exist. I don't build auth,
> billing, or a queue. Lemon Squeezy as merchant of record on pSEO is a good example: it
> handles global sales tax, which is weeks of work with ongoing legal exposure and zero
> customer value.

---

**Q. You've built a lot solo. How do you work in a team?**

> The solo products taught me end-to-end ownership; the team work at Wisflux — LACS, GIBP,
> Typezap — is where I learned the parts that only show up with other people: making design
> decisions reviewable, writing tests other people depend on, and keeping a shared codebase
> navigable. I'd say the honest gap in my experience is that I haven't worked in a large
> engineering organisation with formal design review and on-call rotation, and that's a
> significant part of what I'm looking for in this move.

↳ **This is a strong answer** because it pre-empts the concern ("startup engineer, will they
  cope with process?") instead of waiting to be challenged on it.

---

**Q. How do you keep learning?**

> I build. Every technology I'd claim on my CV, I've shipped something with — that's a
> deliberate filter, because reading about something and having debugged it in production are
> not the same knowledge. Beyond that, release notes for the tools I use daily, and I make a
> point of understanding the layer below the one I work at, because that's where the confusing
> bugs come from.

---

## Honest gaps — Kubernetes, AWS, Kafka

> These are the three most common ATS and interview filters you don't currently have
> (see [resume-v2.md](../resume-v2.md)). **Do not bluff — you'll be caught in one follow-up.**
> A confident, specific "no, and here's what I do have" reads far better than a vague yes.

**Q. Do you have Kubernetes experience?**

> Not in production. I've containerised and deployed everything I've built with Docker, and
> orchestrated multi-service stacks with Compose — including on constrained field hardware
> where the supervision was systemd. I understand what Kubernetes adds over that: declarative
> desired state, self-healing, rolling updates, horizontal autoscaling and service discovery
> across nodes. I haven't operated a cluster, and I'd expect a short ramp rather than a long
> one, because the underlying concepts — containers, health checks, graceful shutdown, config
> and secret injection — are ones I've already had to get right.

---

**Q. Which cloud have you worked on?**

> I've deployed on Vercel, Render, Neon and Supabase, and used AWS S3 for object storage — so
> managed platforms rather than raw infrastructure. I haven't run production workloads on
> EC2/ECS/EKS or built out VPCs and IAM. What I'd say is that the things that transfer are the
> hard parts — stateless services, health checks, zero-downtime deploys, secret management,
> connection pooling — and the cloud-specific console knowledge is the fast part to pick up.

---

**Q. Have you used Kafka?**

> Not Kafka specifically. I've built production queue-based systems with BullMQ on Redis and
> pg-boss on Postgres — retries, backoff, dead-letter queues, idempotent consumers, and
> monitoring queue depth as a leading indicator. I understand Kafka solves a different problem:
> a durable, replayable, partitioned log with multiple independent consumer groups, rather than
> a work queue where a job is consumed once. If the use case is event streaming with replay and
> multiple consumers, that's Kafka; the concepts I'd carry over are partitioning, consumer
> offsets, and designing consumers to be idempotent.

---

> **Closing the gaps honestly:** your DSA plan has slack in Month 2–3
> ([dsa-6-month-plan.md](../dsa-6-month-plan.md)). One weekend deploying an existing project to
> EKS or ECS converts two of these three answers from "I understand it" to "I've done it".

---

## Questions to ask *them*

Asking nothing reads as disinterest. Two or three of these, chosen for the round:

**Engineering:** What does the deploy pipeline look like — how often do you ship, and who
approves it? · How do you handle on-call? · What's the biggest piece of technical debt the team
is carrying? · How much of the codebase would you rewrite given the chance?

**Role:** What would I own in the first six months? · What does the difference between L2 and
L3 look like here in practice? · Who would I be working with most closely?

**Signal-gathering (ask carefully, but ask):** Why is this role open — growth or backfill? ·
How long has the team been together? · What's an example of an engineering decision that got
reversed, and how was that handled?

> That last one is genuinely diagnostic. A team that can describe reversing a decision without
> defensiveness is a team with a healthy engineering culture.

---

## Back to [INDEX.md](INDEX.md)
