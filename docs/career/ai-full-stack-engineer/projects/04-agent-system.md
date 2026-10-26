# AgentSystem — how your code actually works

**What it is, in plain English:** you type a goal into a web page ("build a todo REST API"). A
background worker hands that goal to a chain of LLM "specialists": an Architect picks a tech
stack, a Planner splits the work into small tasks, a Router decides who handles each task, a
Coder writes files, a Reviewer grades them, an Executor runs shell or browser commands, and an
Evaluator judges whether each command worked. What it learns along the way goes into a
vector database, so the next run can recall it. Logs stream live to the browser.

- **Path:** `~/workspace/ai-agent`
- **Stack:** pnpm + Turborepo monorepo · Fastify + socket.io API · BullMQ worker · Redis ·
  Qdrant · Vercel AI SDK (`ai@^3.4`) → OpenRouter (`openai/gpt-4o-mini`) · Zod · node-pty ·
  playwright-core · Next.js 16 + Tailwind 4 · Docker Compose
- **Honest status:** an MVP. 7 commits, all on 2026-05-12, about 1.5k lines of TypeScript
  source. **There are no tests and no CI.** `test-loop.ts` is a manual smoke script
  (`ai-agent/test-loop.ts:21-23`), not a test. The gitignored `workspace/` folder holds a small
  board-game project, which looks like the output of a real run. Treat it as "a working
  prototype I can explain line by line", not "a production platform".

> Reading order if you have 20 minutes: `packages/agents/src/index.ts` (the orchestrator),
> then `packages/executor/src/index.ts` (the tool loop), then `packages/memory/src/`.

---

## JD coverage

| JD requirement | Where | Strength |
|---|---|---|
| Multi-agent system | 6 agent classes + router, wired in `ai-agent/packages/agents/src/index.ts:26-42` | **Strong** (hand-built) |
| Task delegation | LLM router picks `coder`/`executor`/`architect` per task, `ai-agent/packages/agents/src/index.ts:44-52`, `:103-141` | **Strong** |
| Tool calling | Executor picks a tool via structured output, then runs it from a registry, `ai-agent/packages/executor/src/index.ts:57-78` | **Partial**: it uses `generateObject`, not the SDK's native `tools` API |
| Long-term memory | Qdrant, 1536-dim cosine, type filter, `score_threshold: 0.7`, `ai-agent/packages/memory/src/long-term-memory.ts:47-101` | **Strong** |
| Short-term memory | Redis hash per run, 24h TTL, `ai-agent/packages/memory/src/working-memory.ts:42-61` | **Partial**: written, **never read back** (see below) |
| Structured output | 7 Zod schemas through `generateObject`, e.g. `ai-agent/packages/agents/src/reviewer-agent.ts:4-16` | **Strong** |
| Queues / async work | BullMQ queue (2 attempts, exponential backoff), `ai-agent/packages/shared/src/index.ts:45-59`; worker concurrency 2, `ai-agent/apps/worker/src/index.ts:20,36-92` | **Strong** |
| MCP server | None in this repo | **Not present** |
| Human-in-the-loop | None. The run is fully autonomous; the only human action is "Retry" after failure (`ai-agent/apps/web/app/page.tsx:211-218`) | **Not present** |
| React UI | Next.js client page, `ai-agent/apps/web/app/page.tsx:38-280` | **Partial**: one page, desktop-only layout (`w-72` fixed sidebar, `:158`) |
| Realtime updates | Redis pub/sub → API → socket.io rooms → React, `ai-agent/packages/memory/src/working-memory.ts:144-175`, `ai-agent/apps/api/src/routes/runs.ts:37-59` | **Strong** |
| Testing | No test files anywhere | **Not present** |
| Docker | 3 Dockerfiles + compose with Redis and Qdrant, `ai-agent/docker/docker-compose.yml:1-70` | **Strong** for local; no CI |

---

## The big picture

```
 Browser (Next.js, apps/web)                       OpenRouter (gpt-4o-mini, embeddings)
   │ POST /api/runs {goal}        ▲ socket.io 'log'/'status'            ▲
   ▼                              │                                     │
 apps/api  (Fastify :3001) ───────┘                                     │
   │ 1. createRun() in an in-memory Map                                 │
   │ 2. subscribe Redis channel run:<id>:events                         │
   │ 3. queue.add('run-goal', {runId, goal})                            │
   ▼                                                                    │
 Redis ── BullMQ queue "agent-runs" ──► apps/worker (concurrency 2)     │
   ▲                                     │ console.log patched → Redis  │
   │ PUBLISH run:<id>:events             ▼                              │
   └──────────────────────────── AgentOrchestrator.run(goal) ───────────┤
                                   │ recall (Qdrant) ─► Architect ─► Planner
                                   │ for each task:
                                   │   recall 'fix' ─► Router ─┬─► Coder ─► Reviewer (─► Coder retry)
                                   │                           ├─► Executor ⇄ Evaluator (≤3 tries)
                                   │                           └─► Architect
                                   │   remember(...) ─► Qdrant
                                   ▼
                     tools: read_file, write_file, run_command (node-pty),
                            browser_screenshot, extract_dom (Playwright)
```

---

## Follow one run end-to-end

### Step 1: the goal arrives at the API

`ai-agent/apps/api/src/routes/runs.ts:20-62`:

```ts
const run = createRun(goal.trim());
if (USE_QUEUE) {
  const queue = getAgentQueue();
  const memory = new MemoryManager();
  // Subscribe to events BEFORE enqueuing to catch the first logs
  memory.onRunEvent(run.id, (event: any) => {
    if (event.type === 'status') { updateRunStatus(run.id, event.status);
      io.to(run.id).emit('status', { runId: run.id, status: event.status }); }
    ...
  });
  await queue.add('run-goal', { runId: run.id, goal: goal.trim() }, { jobId: run.id });
```

- `createRun` stores the run in a plain JavaScript `Map` (`ai-agent/apps/api/src/store.ts:20-21`,
  commented "replace with PostgreSQL later"). Restart the API and the run list is gone.
- **Subscribe before enqueue** is a small, correct detail. If you enqueued first, a fast worker
  could publish its first log before anyone was listening, and Redis pub/sub does not replay.
- `jobId: run.id` makes the BullMQ job id equal to the run id, so bull-board (mounted at
  `/admin/queues`, `ai-agent/apps/api/src/index.ts:42-52`) lines up with your UI.
- The response is `202 Accepted` (`:91`): "I took it, the work happens later." That is the
  right status code for queued work.
- If `USE_QUEUE` is not `"true"`, the same orchestrator runs **inside the API process** via
  `setImmediate` (`:66-89`). That is a dev fallback that needs no Redis queue.

### Step 2: the queue and the worker

The queue is created once with retry policy (`ai-agent/packages/shared/src/index.ts:48-56`):
`attempts: 2`, exponential backoff starting at 3s, keep the last 100 completed / 50 failed jobs.
The worker (`ai-agent/apps/worker/src/index.ts:36-92`) builds one shared `ToolRegistry` with five
tools (`:28-34`), then per job:

```ts
await memory.setRunStatus(runId, 'running');
originalConsole = { ...console };
console.log = (...args) => {
  originalConsole!.log(...args);
  memory.addLog(runId, 'info', args.join(' '));
};
await orchestrator.run(goal, runId);
await memory.setRunStatus(runId, 'completed');
```

**Monkey-patching** means replacing a built-in function at runtime. Every `console.log` the
agents print becomes a Redis log entry plus a pub/sub message. It's a clever shortcut, but
`console` is **global to the process** and the worker runs **2 jobs at once** (`:20`), so two
concurrent runs overwrite each other's patch and their logs can land under the wrong `runId`.
Know this one; it's a good "what would you fix" answer.

On failure the worker re-throws (`:85`), so BullMQ retries the whole job **from scratch**. There
is no checkpoint, so the Architect and Planner run again and Coder files get rewritten.

### Step 3: the orchestrator

`ai-agent/packages/agents/src/index.ts:57-157`, in order:

1. `memory.initialize()` creates the Qdrant collection if missing (`:63`).
2. **Recall** past knowledge for the whole goal (`:66`). This returns a text block headed
   `## Relevant Past Knowledge` (`ai-agent/packages/memory/src/index.ts:131-139`).
3. **Architect** designs (`:79`), with past knowledge as constraints.
4. **Planner** returns `string[]` tasks (`:92`), given the architecture JSON plus past knowledge.
5. For each task: recall memories of type `'fix'` (`:102`), **route** (`:103`), then dispatch.

The router is just another structured call (`:16-24`, `:44-52`):

```ts
const routingSchema = z.object({
  agentType: z.enum(['coder', 'executor', 'architect']).describe(...),
  reasoning: z.string().describe('Why this agent was chosen'),
});
```

`z.enum` is what makes routing safe: the model **cannot** return `"devops"`, because the SDK
validates the response against the schema. Your `if/else` on `agentType` (`:106-141`) can never
hit an unknown branch.

### Step 4a: Coder → Reviewer

```ts
const codeOutput = await this.coder.code(task, archContext + '\n' + taskMemories);
const review = await this.reviewer.review(task, codeOutput.files);
if (!review.approved) {
  const fixContext = `${archContext}\n\nReviewer feedback:\n${review.issues.map(...)}`;
  await this.coder.code(task, fixContext);
}
await this.memory.remember(`Task: ${task}\nApproach: ${codeOutput.explanation}`, 'code_pattern', { goal, task });
```
(`ai-agent/packages/agents/src/index.ts:111-128`)

- The Coder returns `{files: [{path, content, language}], explanation}` and **writes the files
  itself** using `WriteFileTool` (`ai-agent/packages/agents/src/coder-agent.ts:41-44`).
- The Reviewer returns `approved`, a 0–10 `score`, and `issues` with severity
  `critical|warning|info` (`ai-agent/packages/agents/src/reviewer-agent.ts:4-16`). Its prompt
  says to reject only for runtime or security problems (`:34-35`).
- **Two honest gaps:** the retried code is **not reviewed again** (one retry, then move on), and
  the memory stores the **first** attempt's `explanation`, not the fixed one. So the README's
  "blocks on critical issues" is softer than it sounds.

### Step 4b: Executor ⇄ Evaluator (the tool loop)

`ai-agent/packages/executor/src/index.ts:23-97`:

```ts
while (attempt < maxRetries) {            // maxRetries = 3
  attempt++;
  const { object: decision } = await generateObject({
    system: systemPrompt,                 // lists tools + "History of attempts"
    messages: [{ role: 'user', content: `Task: ${task}` }],
    schema: executionDecisionSchema,      // { toolName, parameters }
  });
  const tool = this.registry.getTool(decision.toolName);
  if (!tool) { contextHistory += `\nFailed: Tool ${decision.toolName} does not exist.`; continue; }
  try { output = await tool.execute(decision.parameters); }
  catch (e: any) { output = { success: false, error: e.message }; }
  const evaluation = await this.evaluator.evaluate(task, tool.name, output);
  if (evaluation.success) return;
  if (evaluation.fix) contextHistory += `\nAttempt ${attempt} failed: ... Suggested fix: ${evaluation.fix}`;
}
throw new Error(`Task failed after ${maxRetries} attempts: ${task}`);
```

Line by line:
- The model picks **one** tool per attempt; each attempt is a single action, not a multi-step
  chain.
- An unknown tool name doesn't crash. It's written into `contextHistory` so the next attempt
  sees the mistake.
- A tool that throws becomes a `{success:false}` result. Errors are **data** for the
  Evaluator, not exceptions.
- The **Evaluator** (`ai-agent/packages/evaluator/src/index.ts:16-31`) is a second LLM that
  judges the output: `{success, reasoning, fix?}`. Output is cut to 5,000 characters (`:22`)
  so a huge `npm install` log doesn't blow the context window.
- `fix` is appended to the prompt for the next attempt. That turns a blind retry into a
  guided one. This is the mechanism genai/14 calls the hard decision, and the code matches.
- The tool argument hints are a **hardcoded if-chain** (`:32-41`) even though every tool already
  has a Zod `schema` (`ai-agent/packages/tools/src/interfaces.ts:12-13`). Add a sixth tool and
  forget the if-chain, and the model sees `Required Arguments: {}`.

### Step 5: the tools

- `read_file` / `write_file` resolve paths against `AGENT_WORKSPACE`
  (`ai-agent/packages/tools/src/file-tools.ts:14-15,32-35`). `path.resolve(base, "../../etc/x")`
  happily leaves the workspace, so there is **no path sandbox**.
- `run_command` spawns `bash -c <command>` in a pseudo-terminal (`node-pty`), with a 50,000-char
  output cap and a 5-minute kill (`ai-agent/packages/tools/src/terminal-tools.ts:18-47`). It
  passes the **full `process.env`** (`:23`), which includes `OPENROUTER_API_KEY`, to whatever
  command the model writes. There is no allowlist.
- The browser tools launch the system Chrome (`ai-agent/packages/tools/src/browser-tools.ts:6-11`).
  Nothing in `docker/Dockerfile.worker` installs Chrome, so expect these to fail inside the
  container.

### Step 6: memory writes

After each task (`ai-agent/packages/agents/src/index.ts:124-150`):

| Outcome | Stored as | Text |
|---|---|---|
| Coder task done | `code_pattern` | `Task: … Approach: …` |
| Executor task done | `fix` | `Successfully executed: <task>` |
| Anything throws | `error` | `Failed task: … Error: …`, then re-throw (stop the run) |

`remember()` embeds the text and upserts a Qdrant point with payload `{type, content,
createdAt, goal, task}` (`ai-agent/packages/memory/src/index.ts:99-114`,
`ai-agent/packages/memory/src/long-term-memory.ts:61-80`). On success the orchestrator calls
`clearRun(runId)` (`:157`), which deletes the Redis keys for that run.

### Step 7: UI updates

`WorkingMemory.log()` does two things (`ai-agent/packages/memory/src/working-memory.ts:162-179`):
`RPUSH` onto `run:<id>:logs` (so the log survives) and `PUBLISH` on `run:<id>:events` (so it's
live). The API's subscriber forwards each message to the socket.io **room** named after the run
(`ai-agent/apps/api/src/routes/runs.ts:48-57`). The browser joins that room with
`socket.emit('subscribe', runId)` (`ai-agent/apps/web/app/page.tsx:107`), and the server calls
`socket.join(runId)` (`ai-agent/apps/api/src/index.ts:78-81`). React appends each log to state
(`ai-agent/apps/web/app/page.tsx:64-70`).

One subtle gap: the browser joins the room only **after** the POST returns, so the first few
live logs can be missed. They're still in the API store, though, and clicking the run
re-fetches them (`:146-153`).

---

## Concepts used here, explained from zero

**Agent vs workflow.** A *workflow* is code that decides the order of steps; the LLM only fills
in each step. An *agent* lets the LLM decide what to do next, usually in a loop with tools.
*Why here:* AgentSystem is **both**. The outer orchestrator is a fixed workflow (Architect →
Planner → for-each task), while the Executor is a small agent loop. Saying "the macro flow is
deterministic, the micro step is agentic" is the accurate description
(`ai-agent/packages/agents/src/index.ts:74-154`). More in
[06-agents-langchain-langgraph.md](../06-agents-langchain-langgraph.md).

**The agent loop.** Think → act → observe → repeat until done or out of budget. *Here:* decide
tool (`generateObject`) → `tool.execute` → Evaluator observes → append `fix` → repeat up to 3
(`ai-agent/packages/executor/src/index.ts:27-95`). The **budget** (`maxRetries`) is what stops an
agent from looping forever. Always name your stop condition in an interview.

**Tool / function calling.** You describe functions (name, description, JSON-schema args) to the
model; it replies "call X with these args"; *your code* runs X and returns the result. The
model never executes anything itself. *Here:* each tool is `{name, description, schema,
execute}` (`ai-agent/packages/tools/src/interfaces.ts:7-16`) in a `Map`-based registry
(`ai-agent/packages/tools/src/registry.ts:6-27`). **Precise wording:** you implemented tool
selection *through structured output* (`{toolName, parameters}`,
`ai-agent/packages/executor/src/index.ts:6-9`), not the provider's native `tools` parameter, and
`parameters` is `z.record(z.any())`, so the arguments are **not** validated against the tool's
own schema before `execute`. See [04-llm-fundamentals-sdks-tool-calling.md](../04-llm-fundamentals-sdks-tool-calling.md).

**Zod and structured output.** Zod is a TypeScript library that describes a data shape once
and gives you a runtime validator plus a static type (`z.infer`). `generateObject` from the
Vercel AI SDK turns that schema into a JSON Schema, asks the model to answer in it, parses the
answer and validates it. On failure it throws instead of handing you garbage. *Here:* 7 schemas
(architecture, plan, routing, code, review, execution decision, evaluation). The wrapper is in
`ai-agent/packages/ai/src/index.ts:35-54`. Two type-safety escape hatches to own up to:
`schema: any` and `as any` (`:35`, `:46`) plus `// @ts-ignore` on the model (`:27`, `:40`), so
callers lose the inferred type. The "CRITICAL: Your entire response MUST be a single valid
JSON object" prompts (e.g. `ai-agent/packages/planner/src/index.ts:17-22`) are belt-and-braces
for weaker OpenRouter models.

**LLM-as-judge.** Using a model to grade another model's output against a rubric. *Here:* two
judges. The Reviewer grades code (score, severity) and the Evaluator grades tool results
(success, fix). The weakness to volunteer: the judge is the **same model** (`gpt-4o-mini`,
`ai-agent/packages/ai/src/index.ts:11`) as the worker, and an `exitCode` is a stronger signal
than an opinion. A good upgrade is "deterministic check first (exit code, test pass), LLM
judge only for ambiguous output".

**Routing.** Classifying an input to pick a handler. It can be rules, embeddings or an LLM.
*Here:* an LLM classifier with a closed `z.enum` (`ai-agent/packages/agents/src/index.ts:16-24`).
It costs one extra LLM call per task. A cheaper alternative is to have the Planner emit
`{task, agentType}` directly.

**Job queues (BullMQ).** A queue decouples "accept the request" from "do the work". The API
pushes a job into Redis, and a separate worker process pulls it, with retries, backoff,
concurrency limits and a dashboard. *Why here:* an agent run takes minutes, and you can't hold an
HTTP request open that long or let one crash take down the API. *Here:*
`ai-agent/packages/shared/src/index.ts:45-59` (producer), `ai-agent/apps/worker/src/index.ts:36-92`
(consumer). `maxRetriesPerRequest: null` (`ai-agent/packages/shared/src/index.ts:32`) is a BullMQ requirement for its blocking
Redis commands.

**Redis pub/sub and WebSockets.** Pub/sub is fire-and-forget broadcast: `PUBLISH channel msg`
reaches whoever is `SUBSCRIBE`d *right now* and nobody else. A subscribed Redis connection
can't run normal commands, which is why the code `duplicate()`s the client
(`ai-agent/packages/memory/src/working-memory.ts:26-34`). WebSockets (here via socket.io) keep a
two-way connection open so the server can push to the browser. *Why both:* the worker and the
API are different processes. Redis bridges them, and socket.io bridges API → browser. Gap:
`onEvent` adds a `message` listener per run and never unsubscribes (`:191-214`), so a
long-lived API slowly leaks listeners.

**Short-term (working) memory.** Per-run scratch state. *Here:* a Redis hash
`run:<id>:context` with a 24h TTL; every write is wrapped in `try/catch {}` so Redis being down
never kills a run (`ai-agent/packages/memory/src/working-memory.ts:48-61`). **Surprise:** the
orchestrator writes `goal`, `architecture` and `plan` into it (`ai-agent/packages/agents/src/index.ts:72,87,94`)
but **nothing ever calls `getContext`/`getAllContext`**. The agents actually pass context through
local variables (`archContext`, `contextHistory`). So in practice working memory is an
observability log, not something the agents read.

**Vector memory with Qdrant.** An *embedding* turns text into a list of numbers (here 1536) so
that similar meanings sit close together. *Cosine distance* measures the angle between two
vectors. Qdrant stores `(vector, payload)` points and finds the nearest ones.
- `score_threshold: 0.7` (`ai-agent/packages/memory/src/long-term-memory.ts:88,98`) means "don't
  return weak matches". Returning nothing is better than injecting irrelevant "memories".
- A *payload filter* (`:91-93`, `must: [{key:'type', match:{value:type}}]`) restricts search to,
  say, only `fix` memories, which is how per-task recall works.
- Failure modes: search errors return `[]` (`:113-115`), which is good. But the embedding
  failure returns `new Array(1536).fill(0)` (`ai-agent/packages/memory/src/embeddings.ts:23-27`),
  and `remember()` then **stores** that zero vector. A zero vector has no direction, so cosine
  similarity with it is undefined. That's a junk point written silently.

---

## Why it was built this way

- **Many narrow agents instead of one big prompt.** Each agent gets a short, focused system
  prompt and its own output schema. That's easier to debug ("the Planner produced bad tasks")
  than one giant prompt doing everything.
- **`generateObject` everywhere.** No regex JSON parsing anywhere; a malformed response is an
  exception, not a silent bug. The cost is that native tool-calling features (parallel calls,
  provider-side validation) aren't used.
- **OpenRouter behind a thin wrapper** (`ai-agent/packages/ai/src/index.ts:4-11`): one key, any
  model, swap by string. The comment says "prevent vendor lock-in".
- **Queue + separate worker:** long runs, retries and crash isolation. Inline mode is kept for
  zero-infra dev.
- **Graceful degradation everywhere:** Redis and Qdrant failures are swallowed so a demo runs
  even with half the infra down. That's the right call for an MVP. It's the wrong call for
  production, where silent failure hides bugs (the zero vector is the proof).
- **Docs say "zero-cost, local-first"** (`ai-agent/docs/understanding.md`): hence gpt-4o-mini,
  Qdrant/Redis in containers, and the system Chrome instead of downloading browsers.

---

## What's missing / what you must not claim

| Don't claim | Reality |
|---|---|
| "LangGraph / LangChain" | Plain TypeScript classes and a `for` loop |
| "Docker sandbox for untrusted code" (README) | `run_command` runs `bash -c` with full env; file paths can escape with `../`; only the whole worker container isolates anything |
| "PostgreSQL" (README, architecture.md) | Not in the code. Runs live in an in-memory `Map` |
| "shadcn/ui" (README) | Not in `apps/web/package.json`; it's plain Tailwind |
| "Durable / resumable runs" | No checkpointing. A BullMQ retry restarts from zero |
| "Agents share working memory" | Working memory is write-only (never read) |
| "Reviewer blocks bad code" | One unreviewed retry, then continue |
| "Native function calling" | Tool choice via `generateObject` |
| "Tested" | No test files, no CI |
| "Human-in-the-loop" | None; fully autonomous |
| "Cost tracking" | The AI SDK `usage` object is never read (no match for `usage` in the source) |

Also: logs can cross between concurrent jobs (global console patch), and the per-task
`architect` route discards its result (`ai-agent/packages/agents/src/index.ts:106-108`).

---

## Translate it to LangGraph

You built a **supervisor + specialists** graph by hand. In LangGraph (Python) it maps almost
one to one. See [06-agents-langchain-langgraph.md](../06-agents-langchain-langgraph.md) for the API
basics.

| Your code | LangGraph |
|---|---|
| Local vars `archContext`, `tasks`, `contextHistory` | `State` (a `TypedDict`) passed between nodes |
| `ArchitectAgent.design`, `PlannerAgent.createPlan` | Nodes (functions `state -> partial state`) |
| `routeTask` + `if/else` | A router node + `add_conditional_edges` |
| Executor `while attempt < 3` | A cycle: `execute → evaluate → (retry? execute : next)` |
| Zod + `generateObject` | Pydantic + `llm.with_structured_output(Model)` |
| Redis working memory (unused) | A **checkpointer** (`PostgresSaver`/`RedisSaver`) saves state after every node, which gives you resume-after-crash |
| Qdrant `remember/recall` | A long-term `Store` (`store.put/search`) or keep Qdrant as a tool |
| BullMQ retry from scratch | Re-invoke with the same `thread_id`; it resumes at the last checkpoint |

```python
from typing import Literal, TypedDict
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver   # Postgres/Redis saver in prod

class Route(BaseModel):
    agent: Literal["coder", "executor", "architect"]
    reasoning: str

class S(TypedDict):
    goal: str; arch: dict; tasks: list[str]; i: int
    attempt: int; history: str; last_ok: bool

def architect(s): return {"arch": llm.with_structured_output(Arch).invoke(s["goal"]).model_dump()}
def planner(s):   return {"tasks": llm.with_structured_output(Plan).invoke(...).tasks, "i": 0}
def route(s) -> str:
    return llm.with_structured_output(Route).invoke(s["tasks"][s["i"]]).agent
def coder(s):     ...  # write files, then reviewer; same as coder-agent.ts
def executor(s):  ...  # pick tool + run; uses s["history"]
def evaluate(s):  ...  # returns {"last_ok": bool, "history": s["history"] + fix, "attempt": +1}
def advance(s):   return {"i": s["i"] + 1, "attempt": 0, "history": ""}

def after_eval(s) -> str:
    if s["last_ok"] or s["attempt"] >= 3: return "advance"
    return "executor"                                  # guided retry = a graph cycle
def more_tasks(s) -> str:
    return "route" if s["i"] < len(s["tasks"]) else END

g = StateGraph(S)
for name, fn in [("architect", architect), ("planner", planner), ("coder", coder),
                 ("executor", executor), ("evaluate", evaluate), ("advance", advance)]:
    g.add_node(name, fn)
g.add_edge(START, "architect"); g.add_edge("architect", "planner")
g.add_conditional_edges("planner", more_tasks, {"route": "router", END: END})
g.add_node("router", lambda s: {})                    # pass-through; decision is in the edge
g.add_conditional_edges("router", route, {"coder": "coder", "executor": "executor",
                                         "architect": "advance"})  # your per-task architect result is discarded too
g.add_edge("executor", "evaluate"); g.add_conditional_edges("evaluate", after_eval)
g.add_edge("coder", "advance"); g.add_conditional_edges("advance", more_tasks, {"route": "router", END: END})
app = g.compile(checkpointer=MemorySaver())
app.invoke({"goal": "..."}, config={"configurable": {"thread_id": run_id}})
```
Sketch only: `Arch`/`Plan` are Pydantic models like `Route`, and `llm` is any chat model. To add the
HITL you don't have today, put `interrupt({"files": ...})` inside `coder` before writing to
disk, and resume with `Command(resume=approved)`.

The line to say: *"I built the orchestration by hand to understand it. In LangGraph the
routing becomes conditional edges, the retry loop becomes a cycle, and the checkpointer gives
me the durable resume my BullMQ version lacks."*

---

## Say it in an interview

**60-second pitch.** "AgentSystem is a multi-agent coding platform I built as a TypeScript
monorepo. A Fastify API accepts a goal and puts it on a BullMQ queue, and a worker runs an
orchestrator. An Architect agent picks the stack, a Planner breaks it into tasks, and for each
task an LLM router delegates to a Coder, which a Reviewer checks, or to an Executor that picks a
tool (shell, file, browser), runs it, and has an Evaluator agent judge the output. The
Evaluator's suggested fix feeds the next attempt, so retries are guided, not blind. Every LLM
call is schema-constrained with Zod through the Vercel AI SDK. Outcomes go to Qdrant as typed
memories with a similarity threshold, and logs stream to the Next.js UI over Redis pub/sub and
socket.io. It's an MVP. I'd add a real sandbox, checkpointing and cost tracking next."

**Likely questions**

1. *How does an agent decide which tool to use?* — The Executor gets a text list of tools and
   the attempt history, and must return `{toolName, parameters}` matching a Zod schema
   (`ai-agent/packages/executor/src/index.ts:6-9,57-61`). I look the name up in a registry; an
   unknown name is recorded as a failure, not a crash.
2. *How do you stop infinite loops?* — `maxRetries = 3` per task; after that it throws, the
   orchestrator stores an `error` memory and stops the run (`:23,97`;
   `ai-agent/packages/agents/src/index.ts:143-152`). BullMQ retries the job at most once more.
3. *How does long-term memory work and how do you avoid irrelevant recall?* — Embeddings in
   Qdrant, cosine, `score_threshold 0.7`, filtered by memory `type`, top 5, injected as a
   "Relevant Past Knowledge" block. Known bug: a failed embedding stores a zero vector. I'd
   fail closed and skip the write.
4. *Why a queue?* — Runs take minutes and can crash. The queue gives retries, backoff,
   concurrency limits, bull-board visibility, and keeps the API responsive (202 Accepted).
5. *How do live logs reach the browser across processes?* — Worker `RPUSH` + `PUBLISH` to
   Redis; the API subscribes per run and emits to a socket.io room; the browser joins the room.
6. *What's the difference between your Reviewer and Evaluator?* — The Reviewer judges code
   before it counts; the Evaluator judges a tool's runtime output and proposes a fix. Both are
   LLM-as-judge with structured verdicts.
7. *Is it safe to run model-generated shell commands?* — Honestly, no, not as built. There's no
   allowlist, full env is passed, and paths can escape. I'd run each task in an ephemeral
   container with no secrets, a read-only mount except the workspace, and a command allowlist.
8. *Why not LangGraph?* — I wanted to own the control flow first. The mapping is direct, and
   LangGraph would give me checkpointing and `interrupt()` for free.

---

## Make it yours — exercises

1. **Fail closed on embeddings.** Start in `packages/memory/src/embeddings.ts:23-27` and
   `packages/memory/src/index.ts:99-114`. Make `generateEmbedding` throw (or return `null`), and
   have `remember` skip the write and log it. *Done when:* with a bad API key, no new point
   appears in Qdrant (`GET :6333/collections/agent_memories`) and the run still completes.
2. **Generate tool descriptions from the Zod schemas.** Replace the if-chain in
   `packages/executor/src/index.ts:32-41` with `zod-to-json-schema` on `t.schema`, and validate
   `decision.parameters` with `tool.schema.safeParse` before `execute`. *Done when:* adding a new
   tool needs zero executor edits, and bad args produce a history entry instead of a tool crash.
3. **Add your first tests.** Add vitest to `packages/executor`, mock `@agent-system/ai`'s
   `generateObject`, and test: unknown tool → retry; evaluator success → return; 3 failures →
   throw. *Done when:* `pnpm --filter @agent-system/executor test` passes with 3+ tests. (Pattern:
   [09-testing-pytest-jest-rtl.md](../09-testing-pytest-jest-rtl.md).)
4. **Fix concurrent log bleed.** In `apps/worker/src/index.ts:54-63`, stop patching the global
   `console`; pass a `log(runId, …)` function into `AgentOrchestrator` instead (or use
   `AsyncLocalStorage`). *Done when:* two simultaneous runs each show only their own logs in the UI.
5. **Add an approval gate (HITL).** Before `CoderAgent` writes files
   (`packages/agents/src/coder-agent.ts:41-44`), set status `awaiting_approval`, publish the file
   list, and wait on a Redis key the UI sets via a new `POST /api/runs/:id/approve`. *Done when:*
   the UI shows Approve/Reject and nothing reaches `workspace/` until you click Approve.
