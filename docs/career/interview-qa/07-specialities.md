# 07 — WebRTC, LLM Orchestration, MCP & Multi-Tenant SaaS

> **This is your moat.** Almost nobody with 4 years' experience can talk credibly about SFU
> media routing *and* LLM failover *and* tenant isolation. The interviewer will likely know
> less than you about at least one of these — which means your job switches from *proving
> competence* to *explaining clearly*. Slow down, define terms, don't show off.
>
> 🔥 = genuinely hard / commonly fumbled.

---

## WebRTC & Mediasoup

**Q. Explain WebRTC in one minute.**

> A browser-native standard for real-time peer-to-peer audio, video and data. Three pieces:
> **getUserMedia** captures the local camera and mic; **RTCPeerConnection** handles the
> encrypted media transport, codec negotiation and network traversal; **RTCDataChannel**
> carries arbitrary data over the same connection. The important thing to know is what WebRTC
> deliberately leaves out — signalling. The spec doesn't say how two peers find each other or
> exchange their connection details; that's yours to build, and it's usually WebSockets.

---

**Q. What is signalling and why isn't it part of the spec?**

> Signalling is the out-of-band exchange of session descriptions (SDP) and ICE candidates so
> two peers can agree on codecs and network paths. It's excluded from the spec because it
> depends entirely on your application — who's allowed to call whom, what a "room" means, how
> presence works. That's application logic, so the standard stays agnostic. In practice I
> implement it over WebSockets: peer A creates an offer, the server relays it to peer B, B
> answers, and both trickle ICE candidates through the same channel.

---

**Q. Explain ICE, STUN and TURN.**

> Most devices are behind NAT, so they don't know their public address and can't be connected
> to directly. **STUN** is a lightweight server that tells a peer "this is how you appear from
> the outside". **ICE** is the framework that gathers every possible candidate — local address,
> STUN-discovered public address, relay address — and systematically tests pairs to find one
> that works. **TURN** is the fallback: a relay server that forwards media when no direct path
> can be established, typically because of symmetric NAT or a restrictive corporate firewall.
>
> The operational point: STUN is nearly free, TURN carries all your media and therefore costs
> real bandwidth. Depending on the network mix, something like 10–20% of connections end up
> relayed — so a production deployment *must* have TURN, and it's the piece people forget until
> calls fail for exactly the users behind a corporate firewall.

---

**Q. What's in an SDP offer/answer?**

> A text description of the session: which media streams are offered, supported codecs in
> preference order, encryption parameters, bandwidth hints and ICE credentials. The offerer
> creates it, the answerer replies with the intersection of what both support. It's negotiation,
> not configuration — which is why an SDP mismatch shows up as "connection succeeds but no
> video", usually a codec both sides claim but only one actually implements for the given
> profile.

---

**Q. 🔥 P2P vs SFU vs MCU — do the maths.**

> With **mesh P2P** and N participants, every peer sends its stream to every other peer:
> each uploads N−1 streams and the total is O(N²) connections. Fine for 2–4 people, and it
> collapses beyond that on typical residential upload bandwidth.
>
> An **SFU** (Selective Forwarding Unit) — Mediasoup, Janus, LiveKit — has each peer upload
> once to the server, which forwards streams to the others without decoding. Upload is O(1) per
> client, server bandwidth is O(N²) but that's server bandwidth, and CPU stays low because
> there's no transcoding. This is the standard architecture and what I'd pick.
>
> An **MCU** decodes everything and composites a single mixed stream per participant, so
> clients download one stream — great for weak devices and for recording, but the transcoding
> cost per room is enormous and it adds latency.
>
> Summary: P2P for 1:1, SFU for group calls, MCU only when clients genuinely can't handle
> multiple streams.

↳ **If pushed:** "why is an SFU cheap if it's O(N²) bandwidth?" Because it never decodes or
  re-encodes — it inspects RTP headers and forwards packets, so CPU stays flat and only
  bandwidth scales. That's the whole reason SFUs beat MCUs in practice.

🔗 *Yours:* StreamVerse does automatic P2P→SFU escalation; LACS uses Mediasoup for multi-party
field comms.

---

**Q. How does Mediasoup model a session?**

> A **Worker** is an OS process pinned to a core (media handling is CPU-bound, so you run one
> per core and shard rooms across them). Inside a worker, a **Router** is effectively a room.
> Each participant has **Transports** — a WebRTC transport carries their media. A **Producer**
> is an incoming track from a client; a **Consumer** is that track being forwarded to another
> client. So a five-person call is five producers and twenty consumers on one router. The key
> design consequence is that scaling past one machine means routing between workers/servers via
> pipe transports, since a router lives on exactly one worker.

---

**Q. What is simulcast and why does it matter?**

> The sender encodes the same video at several resolutions and bitrates simultaneously and
> sends all of them; the SFU picks which layer to forward to each receiver based on their
> bandwidth and how large the video is displayed. That's what makes a mixed call work — a
> participant on mobile data gets 180p while someone on fibre viewing the same speaker gets
> 720p, without the sender re-encoding per receiver. SVC is the newer approach: one scalable
> stream the SFU can drop layers from, more efficient but with narrower codec support.

---

**Q. Which codecs, and why?**

> Audio: Opus, essentially always — it's mandatory-to-implement, adapts bitrate, and handles
> packet loss well. Video: VP8 as the safe universal baseline; H.264 when you need hardware
> encoding on mobile for battery and thermal reasons, or interop with existing systems; VP9 and
> AV1 for better compression at higher CPU cost, with AV1 particularly good at very low
> bitrates. On constrained field hardware, hardware-accelerated H.264 is often the right answer
> even though VP9 compresses better, because CPU is the scarcer resource.

---

**Q. Why does a call fail, and how do you debug it?**

> Ordered by frequency: no TURN server, so anything behind symmetric NAT or a corporate
> firewall never connects; signalling problems — the offer or answer never arrives, or ICE
> candidates arrive before the remote description is set; a WebSocket proxy not forwarding the
> upgrade headers; getUserMedia blocked because the page isn't on HTTPS (it's a secure-context
> API); and codec or bandwidth issues that show as freezing rather than failure.
>
> `chrome://webrtc-internals` is the first stop — it shows the ICE candidate pairs, which one
> was selected, and live stats for packet loss, jitter and bitrate. That usually identifies the
> layer within a minute.

---

**Q. How would you scale a video platform to thousands of concurrent users?**

> Rooms are the natural shard: a room lives on one SFU worker, and you distribute rooms across
> workers and then across servers, with a coordinator assigning new rooms based on load. Deploy
> SFUs geographically close to users because media is latency-sensitive, and route participants
> to the nearest one. Aggressive simulcast so the SFU forwards the minimum viable layer.
> Separate the signalling tier (stateless, easy to scale, sticky by room) from the media tier
> (stateful and CPU-bound). And a TURN fleet sized from measured relay rate, since that's a
> real bandwidth bill. For very large rooms — hundreds of viewers, few speakers — I'd switch
> architecture entirely to a cascading SFU tree or HLS/LL-HLS for the passive audience, because
> viewers don't need sub-second latency, speakers do.

---

## LLM orchestration

**Q. How do you make an LLM feature reliable when providers aren't?**

> Assume every call fails. Concretely: a provider abstraction so the model behind a call is a
> config value, not a hardcoded SDK; timeouts on every request; retries with exponential backoff
> and jitter for transient errors only; a circuit breaker so a dead provider is skipped
> immediately rather than costing every request a timeout; and ordered fallback to a different
> provider, then a smaller model, then a cached or degraded response. Requests go through a
> queue so a burst doesn't melt the rate limit, and everything is idempotent so a retry can't
> duplicate a side effect.

🔗 *Yours:* this *is* the pSEO multi-LLM router — OpenRouter/NVIDIA/Gemini with failover, plus
JSON repair, on a pg-boss queue. It's a strong story because it's a real answer to "design a
system resilient to a flaky third-party API".

---

**Q. 🔥 How do you get reliable structured output from an LLM?**

> In order of preference. First, use the provider's native structured-output or tool-calling
> mode with a JSON schema — the model is constrained during decoding, so malformed output is
> largely impossible. If that isn't available, prompt for JSON, then **validate against a schema**
> (Zod/Pydantic) rather than trusting it. On a validation failure, first try deterministic
> repair — strip markdown fences, fix trailing commas, extract the outermost balanced braces —
> because most failures are formatting, not semantics. Only if repair fails do you retry with
> the validation error fed back as context, capped at a couple of attempts. Lower temperature
> for structured tasks. And crucially, the schema is validated at the boundary, so downstream
> code never sees an unvalidated shape.

↳ **If pushed:** what about output that's *schema-valid but semantically wrong*? That isn't a
  parsing problem, it's an eval problem — the fix is a golden dataset and domain assertions,
  not a stricter schema.

---

**Q. How do you control cost and latency?**

> Cost is tokens in plus tokens out, so: keep prompts tight, don't stuff the whole context when
> retrieval can select the relevant part, cap `max_tokens`, and route by difficulty — a small
> cheap model handles classification and extraction, the expensive one is reserved for
> reasoning. Cache aggressively: exact-match caching for repeated prompts, and provider prompt
> caching for a large stable system prompt across many calls. For latency, stream tokens so
> time-to-first-token is what the user experiences rather than total generation time, and run
> independent calls concurrently instead of chaining them. Then measure per-feature cost —
> unmeasured LLM spend grows silently.

---

**Q. How do you manage the context window?**

> Budget it explicitly: system prompt, retrieved context, conversation history, and reserved
> output space must sum to less than the limit. For long conversations, keep recent turns
> verbatim and summarise older ones. For documents, retrieve the relevant chunks rather than
> including everything. Two effects worth naming: models attend less reliably to the middle of
> a very long context, so position matters — put the most important material at the start or
> end; and a bigger context window is not free, since cost and latency scale with it.

---

**Q. Explain a RAG pipeline end to end.**

> **Ingest:** load documents, chunk on semantic boundaries with a small overlap, embed each
> chunk, store vectors plus metadata. **Query:** embed the question, retrieve top-k by
> similarity — ideally hybrid with keyword search, then rerank — filter by permissions and
> tenant, assemble the prompt with the retrieved chunks, generate, and return the answer with
> citations.
>
> Where it goes wrong in practice is retrieval, not generation. If the right chunk isn't
> retrieved, no amount of prompting fixes it. So I'd evaluate retrieval separately — recall@k on
> a labelled set — before blaming the model.

---

**Q. RAG vs fine-tuning?**

> RAG changes *what the model knows*; fine-tuning changes *how it behaves*. If the need is
> current, proprietary, or frequently-changing facts, that's RAG — updating a document is
> instant, citations are possible, and there's no retraining. If the need is a consistent
> output format, a domain tone, or a specialised task where you have thousands of good examples,
> that's fine-tuning. They compose. The default is RAG, because it's cheaper, auditable, and
> reversible.

---

**Q. How do you evaluate an LLM feature?**

> A golden dataset of inputs with expected outputs or acceptance criteria, run on every prompt
> or model change — otherwise "improving the prompt" is superstition. Deterministic checks
> first (schema validity, required fields present, no forbidden content), then LLM-as-judge for
> qualitative scoring with a rubric, and human review on a sample. In production: log inputs and
> outputs, track failure and retry rates, and give users a thumbs-down that feeds the eval set.
> The mindset shift is treating prompts as versioned artefacts with regression tests, not
> strings you tweak.

---

**Q. What is prompt injection and how do you defend against it?**

> Untrusted content — a web page, a user upload, an email — contains instructions the model
> follows as if they came from you. It's not fully solvable at the prompt layer, so the defence
> is architectural: **treat model output as untrusted input**. Never let a model's output
> directly trigger a privileged action; keep tool permissions minimal and scoped to the user's
> own authority, so the model can't do anything the user couldn't; require confirmation for
> destructive or outward-facing actions; clearly delimit untrusted content in the prompt and
> instruct the model to treat it as data; and validate every tool argument server-side. The
> framing that lands in an interview: the model is a confused-deputy risk, so authorisation
> belongs outside it.

---

**Q. How do you reduce hallucination?**

> Ground the model in retrieved context and require citations, so an unsupported claim is
> visible. Give it an explicit "say you don't know" instruction and reward that path. Lower the
> temperature for factual work. Verify programmatically wherever the domain allows — if it
> produces a SQL query, run an `EXPLAIN`; if it produces code, run the tests; if it produces a
> figure, check it against the source. The general principle: don't ask the model to be
> reliable, build a check that catches it when it isn't.

---

## Agents & MCP

**Q. What is an "agent", concretely?**

> A loop, not magic. The model is given a task and a set of tool definitions; it responds either
> with a final answer or with a request to call a tool; your code executes the tool, appends the
> result to the conversation, and calls the model again. It repeats until done or until a limit
> is hit. Everything that makes agents hard is in the harness around that loop: how tools are
> described, what happens when a tool fails, how you stop runaway loops, and how you keep the
> growing context within budget.

🔗 *Yours:* the NSE trading agent is a from-scratch tool-calling loop, and Glacier Dev runs
multiple specialised agents (Architect / Backend / UI) — you've implemented the loop, not just
used a framework.

---

**Q. How do you design good tools for an agent?**

> The tool description is a prompt — it's what the model reasons over, so it should say what
> the tool does, when to use it, and when not to. Few, well-scoped tools beat many overlapping
> ones, because ambiguity causes wrong selection. Parameters should be simple and validated,
> with strict schemas. Errors must be returned as informative text the model can act on
> ("no results for that symbol; try the search tool first") rather than a stack trace. And any
> tool with real-world side effects needs an authorisation check outside the model.

---

**Q. What is MCP and why does it exist?**

> The Model Context Protocol is an open standard for connecting AI assistants to external
> tools and data. Before it, every assistant had its own bespoke integration format, so
> exposing one system to three assistants meant three implementations — an N×M problem. MCP
> makes it N+M: a server implements the protocol once, and any compliant client can use it. A
> server exposes **tools** (callable functions), **resources** (readable context), and
> **prompts** (reusable templates), over stdio for local servers or HTTP for remote ones.

---

**Q. You've built MCP servers — what did you learn?**

> Two things. First, tool design dominates outcome quality: renaming a tool and rewriting its
> description changes the model's behaviour more than changing the model does. Second, context
> is the scarce resource — a tool that returns a huge blob is worse than one that returns a
> focused answer, because it crowds out everything else and degrades attention. So my tools
> return summaries with a way to drill in, rather than dumping everything.

🔗 *Yours:* UACE (14+ tools, offline semantic search over a codebase, published to npm) and
the Gmail Inbox Agent — both real MCP servers with real tool-design decisions behind them.

---

**Q. How does an agent remember things?**

> Three tiers. Short-term is the conversation context itself, bounded by the window.
> Medium-term is a summary or scratchpad the agent maintains and re-reads. Long-term is
> external — a vector store for semantic recall, or structured records for facts — retrieved on
> demand rather than held in context. The design question is always what deserves to occupy
> context permanently versus what should be retrievable, and the answer is usually "less than
> you think".

---

**Q. When do you use multiple agents instead of one?**

> When subtasks are genuinely independent and can run in parallel, or when they need different
> tools, different context, or conflicting instructions — a writer and a critic shouldn't share
> a prompt. What multi-agent doesn't fix is a task the model can't do; splitting it just
> multiplies cost and adds coordination failure modes. I'd start with one agent and split only
> where there's a concrete reason.

---

## Multi-tenant SaaS

**Q. 🔥 What are the tenant isolation models?**

| Model | Isolation | Cost / ops | Fits |
|---|---|---|---|
| **Shared schema**, `tenant_id` column | Weakest — one bad query leaks | Cheapest, one migration | Most B2B SaaS, many small tenants |
| **Schema per tenant** | Middle | Migrations × tenants | Tens to low hundreds of tenants |
| **Database per tenant** | Strongest | Most expensive | Enterprise, regulated, per-tenant compliance |

> I default to shared schema with a `tenant_id` on every table, because it's operationally
> simplest and scales to many tenants. The risk it carries is exactly one thing — a query that
> forgets the tenant filter — so that risk gets engineered away rather than left to discipline.

↳ **If pushed:** migrating one large tenant off shared schema onto their own database later.
  Answer honestly — it's a real project, which is exactly why the isolation model is worth
  deciding deliberately up front rather than by default.

---

**Q. So how do you guarantee nobody forgets the tenant filter?**

> Defence in depth. At the database, Postgres **row-level security** with a policy comparing
> `tenant_id` to a session variable set per connection — so even a query that omits the filter
> returns nothing. At the application, tenant scoping in a repository layer or ORM middleware
> so raw unscoped queries aren't the default path. In tests, a fixture with two tenants and
> assertions that tenant A can never see tenant B's rows — those are the tests I'd write first.
> And a composite index leading with `tenant_id`, since every query filters on it anyway.

---

**Q. How does a request resolve to a tenant?**

> Subdomain (`acme.app.com`), a path prefix, or a claim in the session — subdomain is the
> cleanest for B2B because it's visible, brandable and easy to route on. Middleware reads the
> host, resolves the tenant, and puts it in a request-scoped context that every downstream layer
> reads. The rule: the tenant comes from the **authenticated session**, never from a
> client-supplied header or body field, or you've built tenant impersonation into your API.

🔗 *Yours:* Resite does wildcard-subdomain portfolio hosting; GIBP is multi-tenant with company
and super-admin scopes.

---

**Q. How do you handle noisy neighbours?**

> Per-tenant rate limits and quotas rather than global ones, so one tenant's burst can't consume
> everyone's capacity. Queue fairness — round-robin across tenants instead of pure FIFO, so a
> tenant enqueuing ten thousand jobs doesn't starve everyone else. Query timeouts and result-set
> caps. Per-tenant metrics so you can *see* which tenant is causing a spike. And for the largest
> customers, the escape hatch of dedicated infrastructure, which is also a natural
> enterprise-tier upsell.

---

**Q. How do migrations work with per-tenant schemas?**

> A migration runner that iterates every tenant schema, applied in batches with progress
> tracking so a failure halfway leaves a known state and is resumable. Migrations must be
> backwards-compatible because tenants will be at different versions mid-run. This is exactly
> the operational tax that makes shared-schema attractive: one migration instead of N, and N
> grows with your sales team's success.

---

**Q. How do you handle per-tenant customisation?**

> Configuration over code: a settings JSON per tenant for feature flags, branding, limits and
> workflow options. The moment you're writing `if (tenant === 'acme')` you've forked the product
> and every future change costs more. If a tenant needs something structurally different,
> that's either a plugin boundary with a defined interface or a genuine product decision — not
> a conditional in a service.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| STUN vs TURN | Discover your public address vs relay your media when direct fails. |
| SFU | Forwards media without decoding — the standard group-call architecture. |
| Jitter buffer | Smooths variable packet arrival at the cost of a little latency. |
| DTLS-SRTP | WebRTC media is always encrypted — it isn't optional. |
| Data channel | Arbitrary P2P data over the same connection (SCTP), ordered or unordered. |
| Token | ~4 characters of English; you pay per token in and out. |
| Temperature | Sampling randomness — low for extraction, higher for creative work. |
| Embedding | Vector representation where distance means semantic similarity. |
| Tool calling | Model returns a structured request; your code executes and returns the result. |
| MCP | Open standard so one integration works across many AI clients. |
| Guardrail | A check outside the model constraining input or output. |
| Semantic caching | Serve a cached answer for a semantically similar question. |
| RLS | Postgres row-level security — the database enforces tenant isolation. |
| Tenant ID source | The verified session. Never a client-supplied value. |

---

## Back to [INDEX.md](INDEX.md)
