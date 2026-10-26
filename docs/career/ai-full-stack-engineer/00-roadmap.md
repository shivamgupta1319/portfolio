# 00: Roadmap (basic → intermediate → advanced)

> **Schedule only.** This file says what to study, in what order, and what each stage lets you
> claim. The teaching lives in modules 01–14.
>
> Pace assumed: **~8 hrs/week for 16 weeks** (≈1 hr on weekdays + 3 hrs on the weekend). With a live
> interview process, compress stages 1–2 into 3 weeks and go straight to the capstone.

---

## Self-assessment: score each 0 / 1 / 2

0 = no idea · 1 = roughly · 2 = could explain it for 5 minutes and write the code

**Foundations**
1. I can explain the difference between a list, tuple, dict and set, and when a generator beats a list.
2. I can write a decorator and a context manager from scratch.
3. I can explain the event loop, `await`, and why `time.sleep()` inside `async def` is a bug.
4. I can explain the GIL and choose between `asyncio`, threads and processes for a given workload.
5. I can write a React component with state, an effect and a custom hook, typed in TypeScript.

**Backend**
6. I can build a FastAPI CRUD API with Pydantic models, dependency injection and proper status codes.
7. I can model a one-to-many relationship in SQLAlchemy 2.0 and write an Alembic migration.
8. I can stream tokens from FastAPI to the browser over SSE.

**AI core**
9. I can explain tokens, context windows, and why output tokens cost more than input tokens.
10. I can write the tool-calling loop by hand against a raw SDK.
11. I can get guaranteed-valid JSON out of an LLM and say what happens when it fails.
12. I can explain chunking, embeddings, cosine similarity, hybrid search and re-ranking.
13. I can explain how I'd measure whether my RAG got better.

**Agentic**
14. I can build a LangGraph `StateGraph` with a conditional edge and a tool node.
15. I can explain checkpointers vs a store (short- vs long-term memory) in LangGraph.
16. I can add a human-approval step to an agent with `interrupt()`.
17. I can build an MCP server and connect it to an agent.

**Production**
18. I can write a multi-stage Dockerfile and a Kubernetes Deployment + Service.
19. I can write a CI pipeline that runs tests, lint, SAST and dependency scanning, and blocks merge on failure.
20. I can trace an agent run in LangSmith or Phoenix and read off latency, tokens and cost per step.

| Total | Start at |
|---|---|
| 0–15 | Stage 1 |
| 16–26 | Stage 2 (skim stage 1's self-checks) |
| 27–34 | Stage 3 |
| 35+ | Capstone + interview drills only |

Re-score at the end of each stage. Any question still at 0 goes to the top of next week.

---

## Stage 1: Basics (weeks 1–4) · "I can recall and explain it"

| Week | Study | Build (type it, don't paste it) | Done when |
|---|---|---|---|
| 1 | [01](01-python-for-ai-backends.md) 🟢🟡 | 10 small scripts: comprehension, generator pipeline, decorator timer, context manager, dataclass, typed function, file I/O, exception hierarchy | Self-check 1–2 at 2 |
| 2 | [01](01-python-for-ai-backends.md) 🔴 (async/concurrency) | Fetch 50 URLs three ways: sync, threads, asyncio + semaphore. Time each | You can explain why the timings differ |
| 3 | [02](02-fastapi-async-pydantic-sqlalchemy.md) 🟢🟡 | FastAPI "notes" API: CRUD, Pydantic schemas, SQLite via SQLAlchemy, pytest with `TestClient` | 10 passing tests |
| 4 | [03](03-react-nextjs-typescript-for-ai-ui.md) 🟢🟡 + [04](04-llm-fundamentals-sdks-tool-calling.md) 🟢 | Next.js page calling your FastAPI. One raw LLM call from Python | The browser shows LLM output from *your* backend |

**What stage 1 unlocks you to say:** "I'm comfortable in Python and FastAPI as well as TypeScript."

---

## Stage 2: Intermediate (weeks 5–9) · "I can build it"

| Week | Study | Build | Done when |
|---|---|---|---|
| 5 | [04](04-llm-fundamentals-sdks-tool-calling.md) 🟡🔴 | Tool-calling loop **by hand** (no framework) with 3 tools, streaming to the UI over SSE | Loop handles a tool error and a max-iteration cap |
| 6 | [05](05-rag-and-vector-databases.md) 🟢🟡 | RAG over 30 PDFs: chunk → embed → pgvector → answer with citations | Answers cite `doc:page` |
| 7 | [06](06-agents-langchain-langgraph.md) 🟢🟡 | Rebuild week 5's agent in **LangGraph** (`StateGraph` + `ToolNode` + checkpointer) | Same behaviour, with resume after a restart |
| 8 | [07](07-mcp-and-service-integration.md) 🟢🟡 | Python MCP server with 3 tools. Plug it into the week-7 graph via `langchain-mcp-adapters` | The agent calls your MCP tool |
| 9 | [08](08-databases-and-data-modelling.md) + [09](09-testing-pytest-jest-rtl.md) 🟢🟡 | Proper schema (users, threads, messages, runs, documents, chunks). pytest + Jest + RTL suites | CI-ready test suites at both ends |

**What stage 2 unlocks:** "I've built agents in LangGraph with tool calling, RAG and MCP integration."
That's the sentence both JDs are screening for.

---

## Stage 3: Advanced (weeks 10–13) · "I can make it production-grade"

| Week | Study | Build | Done when |
|---|---|---|---|
| 10 | [05](05-rag-and-vector-databases.md) 🔴 + [10](10-observability-and-evals.md) | Hybrid search + cross-encoder re-ranker. 30-question golden set. Measure recall@5 before and after | You have a before/after number |
| 11 | [06](06-agents-langchain-langgraph.md) 🔴 | Supervisor multi-agent + long-term memory (`Store`) + `interrupt()` approval | Approve/reject from the UI resumes the graph |
| 12 | [10](10-observability-and-evals.md) 🔴 | LangSmith or Phoenix tracing. Eval run in CI that fails the build if accuracy drops | A red build caused by a bad prompt change |
| 13 | [11](11-devsecops-docker-k8s-cicd-cloud.md) | Multi-stage Docker, kind/minikube K8s deploy, GitHub Actions with Semgrep/Bandit/pip-audit/Trivy/gitleaks + ZAP baseline | Security gates visible in CI |

**What stage 3 unlocks:** the JD-2 "Perfectionist" bullet, meaning observability, evaluation and
security-first CI, backed by artifacts.

---

## Stage 4: Capstone + interviews (weeks 14–16)

| Week | Do |
|---|---|
| 14 | Finish [capstone](13-capstone-build-plan.md) slices 7–8, deploy it publicly, write the README with architecture diagram + eval numbers |
| 15 | [12](12-solution-design-requirement-to-architecture.md): run 4 "requirement → architecture" drills out loud (45 min each) |
| 16 | [14](14-interview-qa.md) + the "Say it in an interview" sections of [projects/](projects/README.md). Mock interviews |

Then put the capstone on shivamgupta.live and your résumé, and **delete** any line on the résumé
you can't defend.

---

## Weekly rhythm

| Day | 1 hr |
|---|---|
| Mon | Read the 🟢/🟡 part of this week's module |
| Tue–Thu | Build task |
| Fri | Self-check out loud. Mark ✅/⚠️/❌ |
| Weekend (3 hrs) | Finish the build, push to GitHub, write 5 lines in the progress log below |

## Progress log

| Week | Built | Self-check score | Stuck on |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |
| 11 | | | |
| 12 | | | |
| 13 | | | |
| 14 | | | |
| 15 | | | |
| 16 | | | |
