# 14: Interview Q&A (Senior Full-Stack AI Engineer)

> **How to use:** cover the answer, say yours out loud, then compare. Mark ✅/⚠️/❌ and re-drill only
> ⚠️/❌. Answers are written as *spoken* answers, short with a hook for the follow-up. 🔥 = commonly
> fumbled. ↳ = the follow-up that's coming.
>
> Deeper banks: [genai/](../genai/INDEX.md) (AI theory), [interview-qa/](../interview-qa/INDEX.md)
> (full-stack), and the "Say it in an interview" section of each [project walkthrough](projects/README.md).

---

## Part A: Your pitch

### A1. "Tell me about yourself" (≈ 90 s)

> "I'm a full-stack engineer with 4+ years, and for the last two I've focused on AI products end to
> end. I've shipped two live AI SaaS products, **pSEO Engine** and **Resite**, both Next.js on the
> front with Postgres, queues and LLM integration behind, which I deploy and run myself.
> On the agentic side I built a **retrieval engine over codebases** with hybrid BM25-plus-embedding
> search, citation validation and a labelled eval set, and a **multi-agent system** where planner,
> coder, reviewer and evaluator agents delegate work with long-term memory in Qdrant. I've also
> published an **MCP server to npm** that gives AI coding tools shared project memory. In Python I
> built an LLM-tracing service on FastAPI with ClickHouse. What draws me to this role is owning the
> whole lifecycle, from requirement to deployed, evaluated agent, and doing it in the LangGraph +
> FastAPI stack you use."

Only add "…including LangGraph with checkpointers and interrupts" **after the capstone slice 4/6 exists.**

### A2. "Walk me through your most complex AI project" → [projects/03](projects/03-repo-intelligence.md) "Say it in an interview".
### A3. "Something you built that failed / a negative result" → repo-intelligence's rejected hypothesis ([projects/03](projects/03-repo-intelligence.md)), or the AI-observability bugs you found by tracing ([projects/01](projects/01-ai-observability-engine.md)).

---

## Part B: Agentic AI

**B1. 🔥 What's the difference between a workflow and an agent, and how do you choose?**
A workflow is code-defined steps. An agent lets the LLM choose the next step in a loop. I start with
the lowest rung that works: deterministic code, then a single call, then a fixed graph, and only then an agent,
because agents add cost, latency and unpredictability. In LangGraph I usually mix them: fixed edges for
the known parts, a conditional edge only where the path depends on what was found.
↳ *Example?* In the insight platform, KPI computation is plain SQL/pandas, while research is agentic.

**B2. Explain tool calling mechanically.**
I send tool schemas with the request. The model replies with a `tool_use` block (name + JSON args) and
stops. My code validates the args, executes, and sends back a `tool_result` tied to that call ID. Then the
model continues or answers. The model never executes anything. I add a step cap, size limits on results,
errors returned as `is_error` results so it can recover, parallel execution for multiple calls, and
authorization checks per call.

**B3. 🔥 Explain LangGraph's core concepts.**
State (a typed dict with reducers like `add_messages`), nodes (functions returning partial state
updates), edges (fixed or conditional), compiled with a checkpointer. The checkpointer saves state after
every step per `thread_id`, which gives you multi-turn memory, crash resume, time travel and human-in-the-loop
via `interrupt()`. A Store holds cross-thread long-term memory.
↳ *Why not just a while loop?* Durable state, interrupts, streaming of node updates, retries per node,
and tracing come for free. I've written the loop by hand, so I know what's abstracted.

**B4. 🔥 How do you design long-term memory for an agent?**
I separate short-term memory (the thread's messages, trimmed or summarized to a token budget, in the
checkpointer) from long-term memory (in a store, namespaced per user/org). Long-term memory is split into semantic facts,
episodic experiences ("this approach worked last time") and procedural rules. Writes happen
selectively, via an extraction step that picks durable facts. Reads use semantic search with a
relevance threshold and a budget. Staleness and conflicts are handled with timestamps, overwrite-by-key
and pruning. In AgentSystem I stored successes and failures in Qdrant with a type filter and a 0.7
score threshold. In UACE I layered working/session/long-term memory with staleness flags and
dry-run pruning.

**B5. How do you implement human-in-the-loop?**
Put an approval node before any irreversible tool, call `interrupt(payload)` there so the graph pauses
with its state checkpointed in Postgres, show the payload in the UI, and resume with
`Command(resume=decision)`. Two gotchas: code before the interrupt re-runs on resume, so side effects
go after it; and the approval must come from a human action, never from a flag the model can set.
↳ That's exactly the weakness I found in my own Inbox Agent: a first call with `confirm:true` sends.
The fix is a server-issued preview token that only the UI click can redeem.

**B6. Supervisor vs swarm vs map-reduce multi-agent.**
Supervisor: a router LLM with structured output picks the next specialist, and specialists report back.
Swarm/handoff: agents hand control directly to each other with `Command(goto=...)`. Map-reduce: `Send` fans out
parallel workers over items and a reducer merges. I choose multi-agent only when tools/prompts conflict or
parallelism helps, because every hop compounds latency and error.

**B7. 🔥 Your agent loops forever / burns money. What do you do?**
Immediately: a recursion/step limit and a per-run token budget in state. Then look at the trace: usually
a vague tool description, a tool error the model doesn't understand, or a missing stop condition. Fix
with "errors that teach", clearer tool docs, and a critic loop bound. Add a trajectory eval so it doesn't regress.

**B8. How do you optimize token usage in an agent?**
Context budgets per section, trimmed or summarized history, compact tool outputs (IDs and previews,
paginate), isolated sub-agent contexts that return only conclusions, prompt caching of the stable prefix
(tools + system), a cheap model for routing, and `max_tokens` with a concise-output instruction. Then measure
cost per successful task.

## Part C: RAG

**C1. Walk through a production RAG pipeline.** Ingest → parse (layout-aware, OCR fallback) → chunk
with metadata → embed → store (pgvector + tsvector) → query rewrite → hybrid retrieve top-50 → RRF
→ cross-encoder re-rank to top 5 → prompt with numbered sources → structured cited answer → citation
validation → stream. Evaluate retrieval and generation separately.

**C2. 🔥 Users say answers are wrong. How do you debug?** Split by stage using traces: was the right
chunk retrieved (recall@k on a labelled set)? Ranked high enough? In the prompt? Was the answer faithful
to it? Each points to a different fix: chunking/hybrid/embeddings, re-ranking, context assembly,
or prompt/model.

**C3. Hybrid search and RRF.** BM25 catches exact terms (IDs, error codes), embeddings catch
meaning. RRF sums `1/(k+rank)` across lists, so no score calibration is needed. I implemented this in
repo-intelligence with k=60.

**C4. 🔥 Re-ranking: bi-encoder vs cross-encoder.** A bi-encoder embeds query and doc separately: fast,
pre-computable, approximate. A cross-encoder reads them together: accurate, slow, so I only use it on the top 20–50.
↳ *Have you used one?* "My production re-ranking is rule-based. I've since added a cross-encoder in my
capstone and measured recall@5 before and after." Say this only once it's true.

**C5. How do you ensure citation accuracy?** Constrain citations to supplied source IDs via
structured output, validate the IDs, require a supporting quote and verify it appears in the chunk,
optionally run an entailment judge, and refuse rather than fabricate. In repo-intelligence I re-read every
cited `path:line` from disk and drop claims that don't hold. A fabricated citation is worse than none.

**C6. Multi-tenant RAG.** Tenant filter inside the vector query (not after top-k), RLS as defence in
depth, deletes that cascade to vectors, and tests that prove user A can't retrieve B's chunks.

**C7. pgvector or a dedicated vector DB?** pgvector by default: one database, joins, transactions,
filters, HNSW. Move when vector count or filtered p95 latency outgrows it, or when you need independent
scaling.

## Part D: Python backend

**D1. 🔥 How do you get high concurrency in a Python AI backend?** Async FastAPI for I/O-bound LLM and
DB calls, with one shared client for pooling. A semaphore around provider calls for rate limits.
CPU-bound work (parsing, re-ranking, local embeddings) goes to a process pool or a separate worker
because of the GIL. Long jobs go to a queue (arq/Celery) with `202 + job_id` and SSE progress. Multiple uvicorn workers across cores.

**D2. What blocks the event loop and how do you find it?** Sync I/O (`requests`, sync DB drivers,
`time.sleep`) and CPU work inside `async def`. Symptoms: all requests slow down together. Find it with
asyncio debug mode / py-spy. Fix with async libraries, `asyncio.to_thread`, or a process pool.

**D3. Pydantic's role in an AI backend?** It's one source of truth for request validation, LLM tool
schemas (`model_json_schema`), structured output parsing, and settings. Business rules go in validators.

**D4. Stream LLM output from FastAPI.** `StreamingResponse` with `text/event-stream`, typed events,
`X-Accel-Buffering: no`, a heartbeat, disconnect detection to stop generation, and an error event.

**D5. SQLAlchemy async pitfalls.** No lazy loading (use `selectinload`), session per request via
`Depends`, pool sizing per worker, `expire_on_commit=False`, and migrations with Alembic reviewed by hand.

## Part E: Frontend

**E1. How do you render a streaming agent response in React?** fetch + ReadableStream parser
(EventSource can't POST), a discriminated-union event type, a reducer per message, memoized bubbles,
Stop via AbortController, tool steps as a live timeline, citation chips and an approval card for
interrupts.

**E2. Where do API keys live in a Next.js + FastAPI app?** Only on servers. The browser talks to a
Next.js route handler / BFF, which calls FastAPI with a server-side token. Never `NEXT_PUBLIC_`.

**E3. How do you test that component?** RTL + MSW returning an SSE body. Query by role and label,
`findBy` for streamed text, plus the error/retry and approval flows.

## Part F: Testing, evals, observability

**F1. 🔥 How do you test something non-deterministic?** Unit-test the deterministic shell (prompt
building, parsing, routing, tools, validators) with fake models. Integration tests use real
Postgres and a fake LLM. Quality goes in an eval layer: a dataset plus code-based and calibrated LLM-judge
evaluators, gated in CI on prompt/graph changes. Assert properties, never exact strings.

**F2. What metrics do you track for an agent?** Latency (TTFT, p95 per node), cost (tokens → $ per
run, tenant and feature, per *successful* task), and quality (task success, faithfulness, citation
validity, tool-selection accuracy, abstention correctness, user feedback).

**F3. LangSmith / Arize experience?** Be honest: "I built my own tracing pipeline (an SDK with an
`@observe` decorator, provider wrappers, ClickHouse) and my own eval harness, so I know what these tools
do underneath. I've since used LangSmith datasets/experiments and Phoenix tracing in my capstone."
(Second sentence only after slice 7.)

**F4. How do you trust an LLM judge?** Binary rubric with a reason, a strong judge from a different
family, randomized order for pairwise comparisons, and measured agreement with ~30–50 human labels before
using it as a gate.

## Part G: DevSecOps

**G1. Walk me through your CI/CD pipeline.** PR: lint, typecheck, unit + integration tests, SAST
(Semgrep/Bandit), SCA (pip-audit/pnpm audit), gitleaks, image build + Trivy, and evals if the agent changed.
Merge: immutable SHA-tagged image with SBOM → staging → migrations → smoke → ZAP baseline → prod
rolling/canary → smoke → auto-rollback.
↳ *Honest version today:* "In my repos I have test + build CI in some projects and solid Docker
deployments; security gates and K8s I've added in my capstone." See [projects/09](projects/09-deployment-ci-testing-evidence.md).

**G2. 🔥 A scanner reports a critical CVE. What do you do?** Read the advisory, check EPSS and CISA
KEV, check reachability (is the vulnerable function used? dev-only? base image?), fix by
upgrade/override/base-image swap, or accept with a documented, expiring exception. Policy: block fixable
HIGH/CRITICAL.

**G3. SAST vs DAST vs SCA.** SAST reads your code. SCA checks your dependencies against CVE databases.
DAST attacks the running app from outside. Each finds things the others can't.

**G4. Kubernetes for an LLM service: what's different?** Readiness checks dependencies but liveness
doesn't (a provider outage must not restart pods). Scale on in-flight requests or queue depth rather than CPU.
Turn off proxy buffering and extend timeouts for SSE. Graceful shutdown for streams. Secrets via an external store.

**G5. Prompt injection: how do you defend an agent?** Separate instructions from data, treat tool
and retrieval output as untrusted, least-privilege tools, risk tiers with human approval for
irreversible actions, output validation, and never execute model output. Tenant identity comes from auth, never
from model-filled arguments.

## Part H: Solution design (see [12](12-solution-design-requirement-to-architecture.md))

**H1. "Design an AI insight platform that turns company data into strategic roadmaps."** Run the
8-step method: clarify → requirements → how-much-AI table → modules → diagram → data/API → risks →
MVP. Key line: *"numbers come only from deterministic tools; the LLM writes narrative and structure,
with a citation on every claim."*

**H2. "You get a vague requirement from a business stakeholder. What do you do first?"** Ask what
decision it drives and what success looks like, find the data and its access rules, agree on a thin MVP
slice with a demo date, and write down assumptions. Then give regular, short updates with a demo,
what's next and any risks.

## Part I: Behavioural (ownership, communication, off-hours)

Use STAR. Stories: [story-bank.md](../story-bank.md), [genai/15](../genai/15-positioning-stories.md).

| Question | Story to use |
|---|---|
| Owned something end to end | pSEO: from idea to a live product with paid plans, including billing webhooks and deployment |
| Production incident / off-hours | A real outage on LACS or pSEO: detection, mitigation, root cause, prevention |
| Made a technical decision under uncertainty | pSEO router → extracting AI-ROUTER as a shared gateway |
| Disagreed / pushed back | Choosing a workflow over an agent, or refusing to ship unverifiable citations |
| Found your own bug / a negative result | repo-intelligence hypothesis rejected; AI-observability cost bug found by tracing |
| Communicated with a non-technical stakeholder | Explaining LLM non-determinism and why you added evals and approvals |

**"Are you okay with off-hours support?"** "Yes, when the business needs it. I've run my own
production systems, so I'm used to being the one who gets paged. I also try to make it rare:
alerts with runbooks, fallbacks for provider outages, and a postmortem after anything that wakes someone up."

---

## Part J: Questions to ask them

1. "What does the agent stack look like today: LangGraph in-process with FastAPI, or LangGraph Platform? Which checkpointer?"
2. "How do you evaluate agent changes before release? Is there a dataset and a CI gate?"
3. "Which model providers, and is there a gateway layer for cost and fallbacks?"
4. "What's the ratio of client delivery to product work, and how are requirements handed over?"
5. "What does on-call look like: rotation, frequency, compensation?"
6. "What would make someone in this role successful in the first 90 days?"
7. "How are MCP servers used: internal tools, client systems, or both?"

---

## Rapid-fire (night before)

- LLM is stateless → you resend history. Output tokens cost ~4–5× input.
- Tool loop: step cap · keep tool_use turn · is_error results · cap result size · parallel calls · validate args.
- LangGraph: State + reducers · nodes · conditional edges · checkpointer (thread_id) · Store · interrupt/Command · Send.
- Memory: short-term = checkpointer (+trim/summarize); long-term = store (semantic/episodic/procedural).
- RAG: hybrid → RRF (1/(60+rank)) → cross-encoder → cite → validate. Evaluate retrieval and generation separately.
- MCP: host/client/server · tools (model) / resources (app) / prompts (user) · JSON-RPC · stdio vs Streamable HTTP + OAuth.
- Async: event loop for I/O, processes for CPU (GIL), semaphore for rate limits, never block the loop.
- Evals: code checks first, calibrated LLM-judge, held-out set, CI gate, cost per *successful* task.
- Security: SAST (code) · SCA (deps) · DAST (running app) · secrets · image scan · EPSS/KEV/reachability.
- K8s: readiness ≠ liveness · don't scale on CPU for I/O · proxy buffering off for SSE.
