# 05 — Agents in production

> You have built **four agent loops** — AgentSystem, Glacier Dev, trading-agent, and the MCP tool
> surfaces in UACE and Inbox Agent. That is more than most candidates. What you have **not** built
> is the production layer: durable execution, human-in-the-loop gates, sandboxing, and cost
> budgets. That gap is where this interview goes.
>
> The conceptual basics — what an agent is, tool design, MCP, agent memory, multi-agent — are in
> [interview-qa/07-specialities.md:274-343](../interview-qa/07-specialities.md). This file is the
> production layer on top.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### The default answer is "don't build an agent"

The strongest opening move in an agent design question is to argue for the simplest thing that
works. Interviewers are testing judgement, and "I'd start with a workflow" is the senior answer
far more often than "I'd build a multi-agent system".

| Shape | Control flow | Use when |
|---|---|---|
| **Single call** | None | One well-specified transformation |
| **Chain** | You wrote it | The steps are known and fixed |
| **Router** | Model picks a branch, you wrote the branches | A few known categories |
| **Workflow (DAG)** | You wrote it | Steps known, some parallel |
| **Agent** | **The model decides** | The steps genuinely can't be known ahead of time |

**An agent is a loop, not magic**: tool definitions go in, the model returns either an answer or a
tool call, you execute the tool, append the result, and call again until it stops or hits a limit.
**The hard part is the harness, not the loop** — the loop is twenty lines.

> 🔗 *Yours:* trading-agent is the textbook version — `agent.py:101-183`, native tool calling,
> `max_steps = 6`, "a safety cap so a confused model can't loop forever", and the stopping
> condition is simply "the model returned content instead of tool calls".

### Patterns worth naming

| Pattern | Shape | Cost |
|---|---|---|
| **ReAct** | Reason → act → observe, repeated | The baseline agent loop |
| **Plan-and-execute** | Plan all steps up front, then execute | Fewer model calls, brittle to surprises |
| **Reflection / self-critique** | Generate, critique, revise | 2–3× cost; real quality gain on writing/code |
| **Evaluator-optimizer** | A separate model scores the output and feeds a fix back into the retry | Strong when there's a clear quality signal |
| **Router / handoff** | Classify, dispatch to a specialist | Cheap; the specialist prompt can be tighter |
| **Orchestrator-worker** | A lead decomposes and delegates to parallel workers | Best multi-agent shape — parallelism with a single writer |

> 🔗 *Yours:* AgentSystem runs **two of these at once**. The orchestrator does
> plan-and-execute with a **router** (`routeTask()` makes an LLM call to pick coder / executor /
> architect) plus **reflection** (the Reviewer critiques the coder's files and one retry runs with
> the issues injected as `fixContext`). The executor runs a **ReAct loop with an
> evaluator-optimizer**: `maxRetries = 3`, and after each tool call an Evaluator agent returns
> `{success, reasoning, fix?}` where `fix` is appended to the context for the next attempt. That
> is LLM-as-judge inside a retry loop, and it's the most interesting mechanism in your codebase.

### Multi-agent — when it helps and when it hurts

**Helps:** independent parallel subtasks (many read-only workers exploring different angles),
genuinely different tool sets or context, and deliberately conflicting instructions — a writer and
a critic should not be the same prompt.

**Hurts:** shared writes (two agents editing the same state is a distributed-systems problem you
just invented), and anything where the subtasks depend on each other's intermediate results — you
pay coordination cost for no parallelism.

**And it does not fix a capability gap.** If one model can't do the task, five can't either; they
just fail more expensively. Cost is roughly linear in agent count, sometimes worse because context
gets duplicated into every one.

**Start with one agent.** Split only when you can name the specific thing that fails.

### Memory

| Tier | Holds | Backed by |
|---|---|---|
| **Context window** | The current turn's working set | Nothing — it's ephemeral |
| **Working / scratchpad** | This run's state, intermediate results | Redis, a run row |
| **Episodic** | What happened in past runs | A DB, searchable |
| **Semantic / long-term** | Facts and learned patterns, retrieved by similarity | A vector store |
| **Procedural** | Learned how-to, often folded back into prompts | Prompt or fine-tune |

**Compaction** is the mechanism that keeps a long run alive: summarise older turns, keep recent
ones verbatim, and reserve output budget. **Memory writes are a failure source** — a wrong fact
written to long-term memory poisons every future run, silently.

> 🔗 *Yours:* AgentSystem has Redis working memory (24h TTL, per-run hash, pub/sub for live UI)
> plus Qdrant long-term memory typed `fix | code_pattern | architecture | error | general`, with
> **every task outcome written back** — successes as patterns, failures as errors — and recalled
> as a `## Relevant Past Knowledge` block at the start of the next run. That is a genuine
> learn-across-runs loop.
>
> 🔗 *Yours:* UACE is the same idea as **infrastructure**: layered memory (working / session /
> long-term), a 6000-char context packet assembled by priority with lowest-priority dropped first,
> normalised dedupe, staleness flags on working memory older than 14 days, and `pruneStale()` that
> never touches the long-term layer.

### Tool design

The tool description **is** a prompt — it is what the model reads to decide whether to call it.
Rules that hold up:

- **Few, well-scoped tools.** Model accuracy degrades as the tool count grows; past a few dozen
  you need tool *retrieval* (search the tool catalogue first).
- **Errors as actionable text, not stack traces.** `"symbol 'foo' not found; did you mean 'food'?"`
  lets the model recover. A traceback doesn't.
- **Return values are structured and bounded.** Truncate large outputs — a tool that dumps 200 KB
  makes the agent worse, not better.
- **Authorisation lives outside the model.** Always. The model chooses *what* to attempt; the
  server decides what is *allowed*.

> 🔗 *Yours:* UACE's lesson — "tool naming and descriptions matter more than model choice; context
> is the scarce resource; returning large blobs made the assistant *worse*." And its rules block
> references explicit `mcp__uace__*` tool names so Claude's built-in save-memory can't shadow them.
>
> 🔗 *Yours (own the flaw):* AgentSystem's executor builds tool descriptions as a **hardcoded
> if-chain per tool name**, even though the tools already carry Zod schemas — duplicated,
> drift-prone metadata. Naming that as a refactor you'd make is a good answer, not a weakness.

### 🔥 Durable execution

The production concern most candidates have never thought about, so it's high-signal.

**The problem:** an agent run takes minutes, calls paid APIs, and has side effects. If the process
dies at step 7 of 10, what happens? Naive answer: it's lost, and you re-run and re-pay — or worse,
re-execute side effects that already happened.

**What durable execution gives you:** state checkpointed after each step, so a crashed run resumes
from where it stopped rather than from the beginning.

**What it requires:**
- **Checkpoint the state, not the stack.** Serialise the message history, step count, and
  accumulated results after each step.
- **Idempotent tools**, or an idempotency key per side-effecting call, so a resume doesn't
  double-charge.
- **Deterministic replay** where the framework replays history — meaning no `Date.now()` or
  `Math.random()` in the orchestration path.

**Approaches:** a durable workflow engine (Temporal, DBOS, Restate), LangGraph's checkpointers, or
the pragmatic one — **a queue with per-step jobs and state in a row**, which is what most teams
actually build.

> 🔗 *Yours:* AgentSystem is BullMQ-backed, so a *job* retries — but the agent restarts from the
> top, since state lives in Redis with a 24h TTL and there's no per-step checkpoint. Say that
> plainly; knowing the difference between job retry and durable resume is the point.

### 🔥 Human-in-the-loop

**Risk-tier your tools.** Not every tool needs a gate; gating everything trains users to click
approve.

| Tier | Example | Control |
|---|---|---|
| Read-only | search, get, list | None |
| Reversible write | draft, stage, create-branch | Log it |
| Irreversible / external | send email, execute trade, delete, deploy, spend money | **Explicit approval** |

**Implement the gate server-side.** A prompt instruction to "ask before sending" is not a control
— the model can be talked out of it.

> 🔗 *Yours — this is your best HITL story, and it's already built.* Inbox Agent's `send_reply`
> without `confirm: true` returns `{status: 'preview', willSend: {...}, note: 'Nothing was sent'}`.
> The model must make a **second explicit call** with `confirm: true` to actually send. Two-phase
> commit for an irreversible action, enforced by the server, **not bypassable by the model**.

**Also:** approval requests need a timeout policy (what happens if nobody responds), an audit
trail of who approved what, and — for resumability — the run has to survive waiting hours for a
human, which is exactly why HITL and durable execution are the same problem.

### 🔥 Budgets and loop-breakers

An agent's failure mode is not crashing — it's spinning expensively.

| Control | Why |
|---|---|
| **Max steps** | The floor. `max_steps = 6` in your trading agent |
| **Wall-clock timeout** | Steps can each be slow |
| **Token / dollar budget** | The one that matters commercially — steps are a poor proxy for cost |
| **Loop detection** | Same tool, same args, repeatedly → break |
| **No-progress detection** | N steps with no state change → break |
| **Graceful degradation** | On budget exhaustion, return partial work with an explanation, not an exception |

**Report the budget in the trace.** "Stopped: hit the max step limit" is a much better failure than
a silent truncation.

### 🔥 Sandboxing

If your agent runs code or shell commands, the sandbox **is** the security model.

| Level | Isolation |
|---|---|
| Same process | None. Never for untrusted code |
| Subprocess + user perms | Weak |
| Container | Reasonable. Drop capabilities, read-only root, non-root user |
| microVM (Firecracker) / hosted (E2B, Modal) | Strong |

**Beyond the sandbox boundary:** filesystem scope, **network egress control** (an agent that can
`curl` can exfiltrate), no ambient credentials in the environment, CPU/memory/time limits, and
ephemeral workspaces destroyed after the run.

> 🔗 *Yours (own it):* AgentSystem's file tools resolve against
> `process.env.AGENT_WORKSPACE || process.cwd()` — but **`path.resolve` does not prevent `../`
> escape**, so the sandbox is nominal. And `run_command` has **no allowlist** — it's arbitrary
> shell via node-pty. Both are real gaps; naming them before an interviewer finds them is worth
> more than either being absent.

### Observability

**A span per step**: model call, tool call, retrieval, with inputs, outputs, tokens, cost and
latency on each. Then:

- **Replay** — re-run a trajectory against a new prompt or model to see if it would have gone
  better.
- **Span-level cost** so you can answer "which step burned the budget".
- **Trajectory diffing** for debugging a regression.

The debugging question — *"the agent did the wrong thing, how do you find out why"* — is answered
by: find the step where the trajectory diverged from what it should have done, look at what the
model saw at that point (the tool result, the truncated context), and decide whether it was a bad
tool description, a bad tool result, or a genuine reasoning failure. Usually it's the middle one.

### Frameworks — the honest map

`as of 2026-08` · APIs here rot fast; know what each is *for*, not its call signatures.

| Framework | What it is | Reach for it when |
|---|---|---|
| **LangChain** | Broad integration/abstraction library | You want many connectors quickly |
| **LangGraph** | Explicit graph state machine with checkpointing | You need durable, resumable, cyclic agent flows |
| **LlamaIndex** | Data/RAG-first framework with agent support | The problem is mostly ingestion + retrieval |
| **CrewAI** | Role-based multi-agent, high-level | Quick multi-agent prototypes |
| **AutoGen** | Conversational multi-agent research framework | Agents that talk to each other |
| **OpenAI Agents SDK** | Lightweight agent loop, handoffs, guardrails | You're on OpenAI and want the loop handled |
| **Claude Agent SDK** | Anthropic's agent harness — tools, subagents, MCP, sessions | You want the harness Claude Code is built on |
| **Pydantic-AI** | Type-safe agents with validated outputs | Python, strong typing, structured results |
| **DSPy** | Programmatic prompt optimisation against a metric | You have a metric and want prompts tuned, not hand-written |
| **smolagents** | Minimal code-writing agent loop | Deliberately small surface |

**"From scratch" is a legitimate answer**, and in your case the honest one:

> "I've built the loop from scratch in Python with native tool calling, and separately with the
> Vercel AI SDK's `generateObject` for schema-constrained steps. For a production system I'd reach
> for LangGraph specifically for the checkpointing — durable resume is the thing I'd rather not
> hand-roll. I wouldn't adopt a framework for the loop itself; that part is twenty lines and I'd
> rather own it than debug someone's abstraction."

---

### 🔥 The LangChain ecosystem — in enough depth to be grilled

**You have not shipped LangChain, and it is on most GenAI job descriptions.** So this section
exists for two purposes: to let you discuss it fluently, and to give you an honest script that
turns the gap into a competence signal rather than a hole.

> ⚠️ The one thing you must fix: `jarvis/package.json` declares `langchain`, `@langchain/core` and
> `@langchain/google-genai` and **never imports them**. If you list LangChain anywhere and an
> interviewer opens that repo, it reads as padding. Either remove the dependencies or don't claim
> the skill.

#### What "LangChain" actually refers to now

The name covers four separate things, and conflating them is the most common tell that someone has
only read about it.

| Package | What it is |
|---|---|
| **`langchain-core`** | The abstractions: Runnable, messages, prompt templates, output parsers, the tool interface |
| **`langchain`** | Chains, agents, retrievers built on core |
| **`langgraph`** | Graph-based stateful orchestration with persistence. **The part that matters in 2026** |
| **`langsmith`** | Hosted tracing, datasets and evals. Works without the rest |

**The historical arc, which is worth being able to narrate:** early LangChain was a large surface
of pre-built chains (`LLMChain`, `ConversationalRetrievalChain`, `initialize_agent`) that were
convenient and hard to debug — you couldn't see the prompt. That was the source of most of the
criticism. It was then rebuilt around **LCEL** and the `Runnable` interface, and the agent story
moved to **LangGraph**. Most of the "LangChain is bad" commentary you'll hear is about the old
pre-built chains, which are now largely deprecated.

#### LCEL — the core abstraction

Everything implements **`Runnable`**, which gives a uniform interface — `invoke`, `batch`,
`stream`, `ainvoke` — and composes with `|`:

```python
chain = prompt | llm | StrOutputParser()
chain.invoke({"question": "..."})     # sync
chain.stream({"question": "..."})     # streaming comes free
chain.batch([{...}, {...}])           # parallelism comes free
```

**What it buys you:** streaming, batching, async and retries are implemented once on the interface
rather than per chain, plus automatic tracing into LangSmith. `RunnableParallel` fans out,
`RunnablePassthrough` threads the original input through — which is how a RAG chain passes the
question to both the retriever and the prompt.

A retrieval chain in the idiom:

```python
chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

**The honest critique to have ready:** the pipe syntax is elegant for a straight line and awkward
the moment you want a conditional, a loop, or state that several steps mutate. That is precisely
why LangGraph exists.

#### LangGraph — the part actually worth adopting

A **state machine**, not a pipeline. You define a typed state, nodes that return partial updates to
it, and edges — including **conditional** edges, which is what gives you cycles.

```python
class State(TypedDict):
    messages: Annotated[list, add_messages]   # reducer: how updates merge into state

graph = StateGraph(State)
graph.add_node("agent", call_model)
graph.add_node("tools", tool_node)
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")              # the cycle — this is the agent loop

app = graph.compile(checkpointer=PostgresSaver(...), interrupt_before=["tools"])
```

The four features that earn it a place, and the reason it's the one framework worth naming in an
interview:

| Feature | Why it matters |
|---|---|
| **Checkpointers** | State persisted after every node. A crashed run **resumes** rather than restarting. This is durable execution, handed to you |
| **`interrupt_before` / `interrupt`** | Pause the graph, surface state to a human, resume on approval — **HITL as a first-class primitive**, not a bolt-on |
| **Threads** | Conversation/run identity built in, so multi-turn state and time-travel to an earlier checkpoint work |
| **Reducers** | Typed rules for how concurrent node updates merge into state — the thing you'd otherwise get wrong with parallel branches |

**Prebuilt shortcuts:** `create_react_agent` for the standard loop, `ToolNode` for dispatch,
`Send` for map-reduce style fan-out to dynamic parallel branches.

> 🔗 *Your bridge:* these map exactly onto gaps you already know you have. "My agents have BullMQ
> job retry, not durable resume — LangGraph's checkpointers are precisely what I'd adopt for that.
> And I built a confirm-gate by hand in my MCP server; `interrupt_before` is the framework version
> of the same idea."

#### LlamaIndex — and when it beats LangChain

Data-first rather than orchestration-first. Its centre of gravity is ingestion and retrieval:
readers for ~150 sources, `IngestionPipeline` with transformation caching, `NodeParser`s
implementing sentence-window and **auto-merging / hierarchical** retrieval, and query engines with
routing and sub-question decomposition.

**Reach for LlamaIndex when the problem is 80% ingestion and retrieval; reach for LangGraph when
it's 80% control flow.** They're commonly used together — LlamaIndex as the retriever inside a
LangGraph node. Saying that is a better answer than picking a side.

#### The rest, in one line each

| Framework | One line |
|---|---|
| **CrewAI** | Role/task/crew abstraction over multi-agent. Fast to demo, opinionated, less control |
| **AutoGen** | Microsoft's conversational multi-agent research framework — agents talk to each other |
| **OpenAI Agents SDK** | Lightweight loop with handoffs, guardrails and sessions. Successor to Swarm |
| **Claude Agent SDK** | Anthropic's harness — tools, subagents, MCP, context compaction. What Claude Code is built on |
| **Pydantic-AI** | Type-safe agents with validated outputs; FastAPI-flavoured ergonomics |
| **DSPy** | Optimise prompts against a metric instead of writing them. Requires evals |
| **Vercel AI SDK** | TypeScript-first: `generateObject`, `streamText`, UI streaming primitives — **the one you've actually used** |
| **Haystack** | Pipeline-oriented, production-leaning, strong on retrieval |
| **smolagents** | Minimal code-writing agent loop |

`as of 2026-08` — APIs in this space rot fast. **Know what each is for, not its call signatures.**

#### The four criticisms, and the honest response to each

Interviewers with scar tissue will raise these. Agreeing thoughtfully scores better than defending.

1. **"Too many abstractions — you can't see the prompt."** True of the old pre-built chains. LCEL
   made composition explicit and LangGraph makes state explicit. Still: if you can't print the
   exact string sent to the model, you can't debug it, and that's a real bar any framework must
   clear.
2. **"Debugging is opaque."** Genuinely the biggest cost. It's also why LangSmith exists — and
   needing a hosted tracing product to debug your framework is itself a comment on the framework.
3. **"It breaks between versions."** It has. Pin versions; treat a framework upgrade as a change
   that runs the eval suite.
4. **"You don't need it."** For the loop, correct — it's twenty lines. For **checkpointed, resumable,
   human-interruptible** execution, hand-rolling is real work you probably shouldn't repeat.

**The synthesis to say out loud:** *"Use the framework for the parts that are genuinely hard —
persistence, interrupts, state merging. Own the parts that are simple — the loop, the prompts, the
tool dispatch. The failure mode is adopting it for the easy part and inheriting the opacity for
free."*

### MCP in production

The basics — N×M → N+M, tools/resources/prompts, stdio vs HTTP — are in
[07-specialities.md:302](../interview-qa/07-specialities.md). The production layer:

- **Remote servers over HTTP** need auth. OAuth, scoped per user, so the server can enforce
  permissions rather than trusting the client.
- **Tool namespacing** — two servers exposing `search` collide. Prefixing matters.
- **Versioning** — a tool whose schema changes breaks every connected client silently.
- **The trust boundary** — an MCP server you didn't write is untrusted code with a prompt surface.
  Its tool *descriptions* are read by the model, which makes a malicious description a prompt
  injection vector.
- **stdout discipline on stdio transport** — anything written to stdout corrupts the JSON-RPC
  stream.

> 🔗 *Yours:* UACE monkey-patches `console.log` to `console.error` at startup so stray library
> writes can't corrupt the transport, and Inbox Agent's header comment says the same thing —
> "stdout is the MCP transport, never write to it." Both ship **18 and 7 tools** respectively over
> stdio, and UACE also ships **2 MCP prompts** (`continue-project`, `save-checkpoint`), which most
> implementations skip entirely.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

### Judgement

**1. 🔥 When would you NOT build an agent?**
> Most of the time. If I can enumerate the steps, I write a workflow — it's cheaper, faster,
> debuggable and deterministic. An agent is justified when the sequence genuinely can't be known
> ahead of time. The progression I'd walk up is: single call → chain → router → workflow → agent,
> and I'd stop at the first one that solves it. Reaching for an agent early is the most common
> expensive mistake in this space.

**2. What actually is an agent?**
> A loop. Tool definitions go to the model, it returns either a final answer or a tool call, I
> execute the tool, append the result to the message history, and call again — until it answers or
> hits a limit. Twenty lines. Everything hard is the harness around it: what tools exist, how
> they're described, what happens when one fails, how you bound cost, what happens when the
> process dies mid-run.

**3. 🔥 When does multi-agent help, and when does it hurt?**
> Helps when subtasks are genuinely independent and parallel, when they need different tools or
> different context, or when you want deliberately conflicting perspectives — a writer and a critic
> shouldn't share a prompt. Hurts when they share writable state, because you've just invented a
> distributed systems problem, and when subtasks depend on each other's intermediate results, so
> you pay coordination cost for no parallelism. And it doesn't fix a capability gap — if one model
> can't do it, five can't either, they just fail more expensively. Start with one.

**4. What's the orchestrator-worker pattern?**
> A lead agent decomposes the task and delegates independent pieces to parallel workers, then
> synthesises. It's the best multi-agent shape because it gets parallelism while keeping a single
> writer — the workers are read-only and the orchestrator owns the result.
>
> 🔗 *Yours:* "Glacier Dev is the fixed version of this — Architect, then Backend, then UI, each
> feeding the next. Sequential rather than parallel, because the stages genuinely depend on each
> other."

**5. Explain the evaluator-optimizer pattern.**
> One model produces, a second scores it against criteria, and the score plus a suggested fix
> feeds the next attempt. It works when there's a clear quality signal.
>
> 🔗 *Yours:* "My executor does this — after each tool call an evaluator returns success, reasoning
> and an optional fix, and the fix goes into the next attempt's system prompt, bounded at three
> retries. It's LLM-as-judge inside a retry loop. The caveat I'd state: the judge is itself a
> model, so it's a heuristic guardrail, not a correctness proof."

### Tools

**6. 🔥 How do you design good tools for an agent?**
> The description is a prompt — it's literally what the model reads to decide when to call it, so
> it gets written with as much care as the system prompt. Few, well-scoped tools rather than many
> overlapping ones, because accuracy degrades with tool count. Strict, validated parameters.
> Errors returned as actionable text, not stack traces, so the model can recover. Bounded return
> values — truncate large output. And authorisation outside the model, always: the model picks
> what to attempt, the server decides what's allowed.

**7. What happens when you have 200 tools?**
> Accuracy collapses — the model can't reliably pick from a catalogue that large, and the
> definitions alone eat the context. The fixes: group tools behind a smaller number of higher-level
> ones; or do tool *retrieval*, where a first step searches the tool catalogue semantically and
> only the relevant handful are exposed. This is the same problem as RAG, applied to tools.

**8. Why return an error string instead of throwing?**
> Because the model is the error handler. A structured, readable error — "file not found at path
> X; the nearest existing path is Y" — lets it correct on the next turn. A thrown exception ends
> the run, and a stack trace in the context is noise.
>
> 🔗 *Yours:* "All five AgentSystem tools return `{success: false, error}` rather than throwing,
> and the executor has an explicit unknown-tool branch that appends the error and retries."

**9. What's the biggest tool-design mistake you've made?**
> Returning too much. In UACE, large blobs of context made the assistant measurably *worse* —
> context is the scarce resource, and a tool that floods it degrades everything after it. The
> lesson was to return focused summaries with a drill-in tool rather than dumping. And separately,
> in AgentSystem I built tool descriptions as a hardcoded if-chain per tool name even though the
> tools already carry Zod schemas — duplicated metadata that will drift. That's a refactor I can
> describe precisely.

### Durability and control

**10. 🔥 Your agent dies at step 7 of 10. What happens?**
> Depends on what you built. With a naive loop it's lost, you re-run, you re-pay, and worse, any
> side effects from steps 1–6 happen again. What you want is durable execution: state checkpointed
> after every step so the run resumes from step 7. That needs the state serialised rather than
> living on the call stack, tools that are idempotent or carry an idempotency key, and no
> nondeterminism in the orchestration path if the framework replays history.
>
> 🔗 *Yours (honest):* "Mine are BullMQ-backed, so the *job* retries — but the agent restarts from
> the top, because state lives in Redis with a TTL and there's no per-step checkpoint. Job retry
> and durable resume are not the same thing, and I know which one I have."

**11. How would you add durable execution to an existing agent?**
> Serialise the loop state — message history, step index, accumulated results — into a row after
> each step, keyed by run id. Make every side-effecting tool take an idempotency key derived from
> run id plus step index, so a resumed step that already executed is a no-op at the far end. Then
> the resume path loads the row and continues. If I wanted it off the shelf I'd use LangGraph's
> checkpointers or a workflow engine like Temporal, but the queue-plus-state-row version is what
> most teams actually build and it's usually enough.

**12. 🔥 How do you stop an agent running away?**
> Layered limits, because each catches a different failure. Max steps is the floor. A wall-clock
> timeout, because steps can individually be slow. A token or dollar budget, which is the one that
> actually matters commercially — step count is a poor proxy for cost. Loop detection, so the same
> tool with the same arguments repeatedly breaks out. And no-progress detection. On exhaustion I
> degrade gracefully: return partial work with an explanation rather than throwing.
>
> 🔗 *Yours:* "trading-agent caps at six steps and returns 'Stopped: hit the max step limit without
> a final answer' — an explicit, readable failure rather than a silent truncation. What it doesn't
> have is a token budget, which is the one I'd add first."

**13. 🔥 Your agent has database write access. How do you sleep at night?**
> I don't give it unbounded write access. Tools get risk tiers: reads are ungated, reversible
> writes are logged, irreversible or external actions require explicit approval — and the approval
> is enforced server-side, because a prompt instruction saying "ask first" is not a control, the
> model can be talked out of it. Beyond that: scoped credentials so the tool can only touch what it
> needs, no ambient admin connection, an audit log of every action with the run that caused it, and
> where possible a dry-run mode that returns the diff before applying it.
>
> 🔗 *Yours:* "I've built exactly this. In Inbox Agent, `send_reply` without `confirm: true`
> returns a preview of what *would* be sent and explicitly says nothing was sent. Sending requires
> a second call with `confirm: true`. It's a two-phase commit for an irreversible action, enforced
> by the server — the model cannot bypass it."

**14. How do you handle an approval that nobody answers?**
> It needs a timeout policy decided up front — expire and abandon, expire and escalate, or hold
> indefinitely — plus notification so the human knows they're blocking. And the run has to survive
> waiting hours, which is exactly why human-in-the-loop and durable execution are the same problem:
> you can't hold a process open for a day.

**15. 🔥 How do you sandbox an agent that runs code?**
> The sandbox *is* the security model, so it has to be a real boundary — a container at minimum,
> better a microVM or a hosted sandbox like E2B. Inside that: non-root, read-only root filesystem
> with a scoped writable workspace, dropped capabilities, CPU/memory/time limits, and an ephemeral
> workspace destroyed after the run. The one people forget is **network egress** — an agent that
> can make outbound requests can exfiltrate whatever it read, so egress is deny-by-default with an
> allowlist. And no credentials in the environment; if a tool needs a secret, it's brokered outside
> the sandbox.
>
> 🔗 *Yours (own it):* "Mine isn't there. AgentSystem's file tools resolve paths against a
> workspace root, but `path.resolve` doesn't prevent `../` escape, so it's nominal. And
> `run_command` has no allowlist at all — it's arbitrary shell through node-pty. That's fine for a
> local dev tool I run on my own machine and completely unacceptable multi-tenant, and I'd fix the
> escape first because it's the cheap one."

### Memory and observability

**16. How does an agent remember things across runs?**
> Three tiers. The context window holds the current turn and is ephemeral. Working memory holds
> this run's state — I use Redis with a TTL, keyed by run. Long-term memory is an external store,
> usually vector plus structured, retrieved by similarity at the start of a run and written back at
> the end.
>
> 🔗 *Yours:* "AgentSystem writes every task outcome to Qdrant typed as fix, code_pattern,
> architecture or error — successes and failures both — and recalls the top five as a 'relevant
> past knowledge' block at the start of the next run. So it genuinely learns across runs. The
> retrieval is filtered by memory type with a 0.7 score threshold, because below that it's noise
> rather than a memory."

**17. What can go wrong with agent memory?**
> Poisoning, mostly. A wrong fact written to long-term memory contaminates every future run, and
> it does so silently — nothing errors. So writes deserve more scrutiny than reads: what qualifies
> as memorable, is it scoped correctly, is it staleable.
>
> 🔗 *Yours:* "UACE flags working memory older than 14 days as possibly stale and has a
> `pruneStale` that deletes working and session layers on a 30-day default while never touching
> long-term. And AgentSystem has a bug in exactly this area I can describe — on embedding failure
> it returns a 1536-dimension zero vector instead of failing, which silently writes a poisoned
> point into the collection. It doesn't crash, which is what makes it bad."

**18. The agent did the wrong thing. How do you debug it?**
> Find the step where the trajectory diverged from what it should have done, then look at exactly
> what the model saw at that point — the tool result it got, what was truncated out of context, the
> tool descriptions it was choosing from. In my experience it's usually not a reasoning failure,
> it's a bad tool result or a tool description that made the wrong tool look right. That's why I
> want a span per step with inputs, outputs, tokens and latency, and the ability to replay a
> trajectory against a changed prompt.

**19. How do you evaluate an agent?**
> Trajectory, not just outcome — see [04-evals.md](04-evals.md). Task success is the headline, but
> also tool-selection accuracy per step, steps versus the minimum, redundant calls, cost per task,
> and recovery when a tool fails. A 95% agent averaging 30 steps is worse than a 90% one averaging
> 6, and outcome-only scoring can't see that.

### Frameworks and MCP

**20. 🔥 LangChain or build it yourself?**
> For the loop itself, build it — it's twenty lines and I'd rather own it than debug someone's
> abstraction when a provider changes. Where a framework genuinely earns its place is
> **checkpointing**: LangGraph's persistence gives me durable resume, which is fiddly and
> important, and I wouldn't hand-roll it for production. LlamaIndex if the problem is mostly
> ingestion and retrieval. I'd be wary of the high-level multi-agent frameworks — they make the
> easy part easier and the hard part opaque.
>
> The rule I'd state: **use the framework for what's genuinely hard — persistence, interrupts,
> state merging — and own what's simple.** The failure mode is adopting it for the easy part and
> inheriting the opacity for free.

**20a. 🔥 Have you used LangChain?** *(The blunt version. Expect it verbatim.)*
> Not in production, and I'd rather say that than overstate it. What I've used is the Vercel AI
> SDK for schema-constrained generation, and I've written agent loops from scratch with native
> tool calling — so I've built the things LangChain abstracts rather than consumed them.
>
> I know the ecosystem well enough to be useful on day one: core is the Runnable interface and
> LCEL composition, `langchain` is the chains and retrievers on top, LangGraph is the stateful
> graph with checkpointers, and LangSmith is tracing and evals. If I were picking up an existing
> LangChain codebase the parts I'd want to understand first are what state the graph holds and
> where the checkpointer writes, because that's where the real behaviour lives.
>
> ↳ **If pushed — would you introduce it to a greenfield project?** "LangGraph, yes, for durable
> resume and human-in-the-loop interrupts. The full chain abstraction, probably not — I've found
> being able to print the exact string sent to the model matters more than composition sugar."

**20b. What is LCEL and what does it buy you?**
> LangChain Expression Language — everything implements a `Runnable` interface and composes with
> the pipe operator: `prompt | llm | parser`. What it buys is that streaming, batching, async and
> retries are implemented once on the interface rather than per chain, plus automatic tracing.
> `RunnableParallel` fans out and `RunnablePassthrough` threads the original input through, which
> is how a RAG chain feeds the question to both the retriever and the prompt.
>
> The limitation is the honest part: a pipe is elegant for a straight line and awkward as soon as
> you want a conditional, a cycle, or state several steps mutate. That's exactly why LangGraph
> exists as a separate thing.

**20c. 🔥 What does LangGraph give you that a hand-rolled loop doesn't?**
> Four things, and they're the four I'd otherwise have to build. **Checkpointers** — state
> persisted after every node, so a crashed run resumes instead of restarting, which is durable
> execution handed to you. **Interrupts** — `interrupt_before` pauses the graph, surfaces state for
> approval and resumes, so human-in-the-loop is a primitive rather than a bolt-on. **Threads**, so
> multi-turn identity and time-travel to an earlier checkpoint work. And **reducers** — typed rules
> for how concurrent node updates merge into state, which is the thing you get wrong by hand the
> moment you have parallel branches.
>
> The mental model is a state machine, not a pipeline: typed state, nodes returning partial
> updates, and conditional edges — and the conditional edge back to the agent node *is* the loop.
>
> 🔗 *Yours:* "These map straight onto gaps I know I have. My agents have BullMQ job retry rather
> than durable resume, and I hand-built a confirm-gate in my MCP server — `interrupt_before` is the
> framework version of exactly that."

**20d. LangChain or LlamaIndex?**
> Different centres of gravity. LlamaIndex is data-first — readers for a large number of sources,
> an ingestion pipeline with transformation caching, node parsers implementing sentence-window and
> auto-merging retrieval, query engines with routing and sub-question decomposition. LangGraph is
> orchestration-first. So: LlamaIndex when the problem is 80% ingestion and retrieval, LangGraph
> when it's 80% control flow. In practice they compose — LlamaIndex as the retriever inside a
> LangGraph node — and I'd rather say that than pick a side.

**20e. What are the real criticisms of LangChain?**
> Four, and I think three are fair. Too many abstractions hiding the prompt — that was true of the
> old pre-built chains like `LLMChain` and `initialize_agent`, and LCEL plus LangGraph were the
> response; the bar any framework has to clear is that I can print the exact string sent to the
> model. Opaque debugging, which is genuinely the biggest cost and is why LangSmith exists —
> needing a hosted tracing product to debug your framework is itself a comment on the framework.
> Breaking changes between versions, which is a pinning-and-eval-suite problem. And "you don't need
> it", which is right for the loop and wrong for checkpointed resumable execution.

**21. What is DSPy for?**
> Treating prompts as parameters to be optimised against a metric rather than as text you hand-
> write. You define the signature and the metric and it searches for prompts and few-shot examples
> that maximise it. It's genuinely interesting, it requires you to have a metric — which is another
> way of saying it requires evals — and I haven't shipped it.

**22. What's MCP and why does it matter?**
> It turns an N×M integration problem into N+M: every assistant speaks one protocol, every tool
> provider implements it once. It carries tools, resources and prompts, over stdio for local
> servers or HTTP for remote.
>
> 🔗 *Yours:* "I've published one to npm — 18 tools and 2 prompts over stdio, which is a shared
> local-first project memory any assistant can read. The lesson was that tool naming and
> descriptions mattered more than model choice, and that context is the scarce resource."

**23. 🔥 What changes when an MCP server is remote rather than stdio?**
> Auth becomes the whole problem. Local stdio inherits the user's machine trust; remote needs
> OAuth with per-user scopes so the server enforces permissions rather than trusting the client.
> Then: tool namespacing, because two servers exposing `search` collide; schema versioning, since
> changing a tool's shape breaks every connected client silently; and rate limiting per client.
> And the trust boundary — a third-party MCP server is untrusted code whose *tool descriptions*
> are read by the model, which makes a malicious description a prompt injection vector.

**24. Why does stdout discipline matter on stdio transport?**
> Because stdout *is* the JSON-RPC channel. Any stray write — a library's debug log, a stray
> `console.log` — corrupts the stream and the client sees a protocol error rather than a useful
> message.
>
> 🔗 *Yours:* "I monkey-patch `console.log` to `console.error` at startup in UACE for exactly this,
> and the Inbox Agent MCP file's header comment says the same thing. It's the kind of thing you
> only write after it's bitten you."

**25. What are MCP prompts and resources, and why does nobody use them?**
> Tools are model-invoked; **resources** are application-controlled context the client can attach;
> **prompts** are user-invoked templates, usually surfaced as slash commands. Most implementations
> ship tools only because that's the part the model drives. Shipping prompts is a nice signal.
>
> 🔗 *Yours:* "UACE ships two — `continue-project` and `save-checkpoint`."

### Design

**26. Design an agent that files expense reports from receipt photos.**
> Clarify first: volume, who approves, what system of record, what accuracy bar. Then I'd argue
> against an agent for most of it — extraction from a receipt is a single structured-output call
> with a schema, not a loop. The workflow: OCR/VLM extract → validate against the schema →
> deterministic policy checks (is this category allowed, is it over the limit) → match to a
> transaction → if everything passes, submit; if anything fails, route to a human with the
> extracted fields pre-filled. The agentic part is only the ambiguous middle — "this receipt is in
> a foreign currency and doesn't match any transaction" — and that's where I'd allow tool use.
> Submitting is irreversible, so it's gated. Cost per receipt is the metric that decides the model.

**27. Your agent works 70% of the time. Get it to 95%.**
> First, find out *how* it fails — trajectory eval, grouped by failure mode. The distribution
> almost always shows a small number of causes. Typical order of fixes: tool descriptions, because
> wrong-tool-selection is the most common single cause and it's the cheapest fix; then tool result
> quality — truncated, unstructured or unhelpful returns; then constrain the space, replacing
> agentic freedom with a deterministic workflow wherever the steps *are* actually knowable; then a
> validation-and-retry loop on the output; then a stronger model on the specific step that fails,
> not everywhere. What I wouldn't do first is add more agents.

**28. How much should an agent run cost?**
> That's a product question I'd want answered before designing, because it determines the model
> tier, whether reflection is affordable, and how many steps I can allow. Then I'd instrument it —
> tokens and cost per span, so I can say which step burned the budget — and set a per-run budget
> that degrades gracefully rather than a step count that doesn't correlate with spend.
>
> **Honest gap:** "AgentSystem calls `gpt-4o-mini` about four times per task — route, agent,
> review, evaluate — and discards the AI SDK's usage object entirely. There's no cost tracking at
> all. That's its biggest operational blind spot and I'd fix it before scaling anything."

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Agent | A loop where the model decides the next step |
| Workflow | A loop where you decided the steps |
| ReAct | Reason → act → observe, repeated |
| Plan-and-execute | Plan all steps up front, then run them |
| Reflection | Generate → critique → revise |
| Evaluator-optimizer | A second model scores and feeds a fix into the retry |
| Orchestrator-worker | Lead decomposes, workers run in parallel, lead synthesises |
| Handoff | One agent transfers control to a specialist |
| Trajectory | The full sequence of steps a run took |
| Tool description | A prompt — it's how the model decides to call |
| Tool retrieval | Semantic search over the tool catalogue when there are too many |
| Working memory | This run's state; TTL'd |
| Long-term memory | Facts across runs, usually vector-backed |
| Compaction | Summarise old turns, keep recent ones verbatim |
| Durable execution | Checkpoint per step so a crash resumes, not restarts |
| Idempotency key | What stops a resumed step double-charging |
| HITL gate | Server-enforced approval before an irreversible action |
| Risk tier | Read / reversible / irreversible — determines the control |
| Loop-breaker | Same tool + same args repeatedly → stop |
| Step budget | Max iterations; a poor proxy for cost |
| Token budget | The limit that actually maps to money |
| Sandbox | Container or microVM — the actual security boundary |
| Egress control | Deny outbound by default, or your agent can exfiltrate |
| Span | One traced step: input, output, tokens, cost, latency |
| Replay | Re-run a recorded trajectory against a new prompt/model |
| MCP | One protocol so N assistants × M tools becomes N + M |
| MCP prompt | User-invoked template, usually a slash command |
| stdout discipline | On stdio transport, stdout is the protocol — never log to it |
| **Runnable** | LangChain's core interface — invoke/batch/stream/async, composable with `\|` |
| **LCEL** | `prompt \| llm \| parser` — streaming and batching for free, awkward for cycles |
| **RunnablePassthrough** | Threads the original input alongside a transformed one |
| **StateGraph** | LangGraph's typed state machine — nodes return partial state updates |
| **Conditional edge** | The branch that creates the cycle — i.e. the agent loop |
| **Reducer** | How concurrent node updates merge into shared state |
| **Checkpointer** | Per-node state persistence → crash resume and time-travel |
| **`interrupt_before`** | Pause the graph for human approval, then resume |
| **Thread** | LangGraph's conversation/run identity for multi-turn state |
| **`create_react_agent`** | Prebuilt standard ReAct loop |
| **LangSmith** | Hosted tracing, datasets and evals — usable without the rest |
| **Auto-merging retrieval** | LlamaIndex: retrieve leaf nodes, return the merged parent |
| **IngestionPipeline** | LlamaIndex's cached transform chain over documents |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| The agent loop | trading-agent | "Native tool calling, six-step cap, stops when the model returns content instead of tool calls." |
| LLM-as-judge in a retry | AgentSystem | "An evaluator scores each tool result and its `fix` goes into the next attempt's prompt, bounded at three." |
| Router | AgentSystem | "An LLM call picks coder, executor or architect per task." |
| Reflection | AgentSystem | "The reviewer critiques generated files and one retry runs with the issues injected." |
| Learn across runs | AgentSystem | "Every outcome — success or failure — is written to Qdrant typed, and recalled as past knowledge next run." |
| Filtered vector memory | AgentSystem | "Payload filter on memory type with a 0.7 threshold; below that it's noise." |
| Sequential specialists | Glacier Dev | "Architect → Backend → UI, each output threaded into the next prompt." |
| JSON retry with error feedback | Glacier Dev | "Parse failure re-prompts the *same* model with the error text, then falls through to the next model." |
| **HITL approval gate** | **Inbox Agent** | **"`send_reply` returns a preview unless `confirm: true` — two-phase commit, enforced server-side, not bypassable by the model."** |
| Deterministic over LLM | Inbox Agent | "The classifier is regex; the reasoning is Claude's. I didn't put a model where a rule works." |
| Tool surface as product | UACE | "18 tools and 2 prompts over stdio; tool naming mattered more than model choice." |
| Context budgeting | UACE | "A 6000-char packet assembled by priority, lowest dropped first, with staleness flags." |
| Transport discipline | UACE, Inbox Agent | "stdout is the MCP transport — I patch `console.log` to stderr at startup." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Durable execution** | "BullMQ gives me job retry, not durable resume — my agents restart from the top. I know the difference and I know what checkpointing would take." |
| **Sandboxing** | "`path.resolve` doesn't stop `../`, and `run_command` has no allowlist. Fine for a local dev tool, unacceptable multi-tenant. I'd fix the escape first." |
| **Agent cost tracking** | "AgentSystem makes ~4 model calls per task and discards the usage object entirely. Biggest operational blind spot in it." |
| **LangChain / LangGraph** | "Not in production, and I'd rather say that than overstate it. I've used the Vercel AI SDK and written loops from scratch — I've built what LangChain abstracts rather than consumed it. I know the ecosystem well enough to be useful on day one, and LangGraph's checkpointers are exactly what I'd adopt for the durable-resume gap in my own agents." **Also: delete the unused `langchain` deps from `jarvis/package.json` before you claim anything here.** |
| **LlamaIndex** | "Haven't used it. I know its centre of gravity is ingestion and retrieval — auto-merging, sentence-window, cached ingestion pipelines — and I've hand-built the equivalents in repo-intelligence." |
| **Trajectory eval** | "I evaluate retrieval rigorously in repo-intelligence but I've never scored an agent's trajectory. I know what I'd measure." |
| **Remote MCP / OAuth** | "Both my servers are stdio and local-first. I understand what remote adds — per-user scopes, namespacing, schema versioning — but haven't shipped it." |
| **Multi-agent at scale** | "Three fixed stages in Glacier Dev and a router in AgentSystem. Not a dynamic swarm, and I'd argue against one anyway." |

---

## What's NOT here

| Topic | Doc |
|---|---|
| What an agent is, tool design basics, MCP basics, agent memory tiers | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |
| Tool/function-call schema mechanics, `tool_choice`, parallel calls | [02-prompting-structured-output.md](02-prompting-structured-output.md) |
| Scoring agent trajectories | [04-evals.md](04-evals.md) |
| Prompt injection through tool output and the corpus | [07-safety-guardrails.md](07-safety-guardrails.md) |
| Tracing, spans, per-step cost in production | [08-llmops.md](08-llmops.md) |
| Designing an agent platform as an HLD | [11-ai-system-design.md](11-ai-system-design.md) |
| Implementing an agent loop from scratch, under time pressure | [12-ai-machine-coding.md](12-ai-machine-coding.md) |
| The full AgentSystem / Glacier / Inbox Agent write-ups | [14-deepdive-projects.md](14-deepdive-projects.md) |

---

← Back to [INDEX.md](INDEX.md)
