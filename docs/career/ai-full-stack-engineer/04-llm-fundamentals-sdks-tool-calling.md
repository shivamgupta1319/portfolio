# 04: LLM Fundamentals, SDKs and Tool Calling

> **JD lines covered:** "Integrate LLMs" · "prompt engineering" · "OpenAI/Gemini/Claude SDKs" ·
> "tool calling, function calling" · "optimize token limits".
>
> Theory deep-dive (attention, KV cache, sampling internals): [genai/01](../genai/01-foundations.md).
> Structured output and caching math in interview depth: [genai/02](../genai/02-prompting-structured-output.md).
> This file is the **working engineer's** version: what you need in order to integrate a model correctly.

---

## 🟢 Level 1: Basics

### 1.1 What an LLM call actually is

An LLM is a function: **list of messages in → next tokens out**. It's **stateless**. It remembers
nothing between calls, so *you* resend the conversation every time. Every "memory" feature in
every product is engineering around that fact.

```
request  = model + system prompt + messages[] + tools[] + limits
response = content blocks (text / tool calls) + stop_reason + usage {input_tokens, output_tokens}
```

### 1.2 Tokens

- A **token** is a sub-word piece, about 4 English characters or ¾ of a word. Hindi and code use more
  tokens per character.
- **Context window** = max input + output tokens per call. Modern models: 200K–1M.
- **Pricing** is per million tokens. **Output costs about 4–5× input.** So verbose answers cost more than long
  prompts.
- **Latency** ≈ time-to-first-token (grows with input length) + output tokens ÷ tokens per second.
  Output length dominates, so cap `max_tokens` and ask for concise output.

Cost math to do in your head: 2,000 input + 500 output tokens on a $2/$10 per MTok model costs
(2000×2 + 500×10)/1e6 = **$0.009 per call**. At 100k calls/day that's $900/day, which is why
caching, routing and trimming matter.

### 1.3 Roles

| Role | Purpose |
|---|---|
| **system** | Who the model is, rules, output format, tool-use policy. Highest authority |
| **user** | The human's input (and, in the Claude API, tool *results*) |
| **assistant** | The model's previous replies (and its tool *calls*) |
| **tool** (OpenAI) | Tool results go in their own role in OpenAI's format |

### 1.4 Sampling knobs

`temperature` (randomness), `top_p`, `max_tokens`, and stop sequences. Lower temperature means more
repeatable output. **Volatile:** the current Claude API **rejects** `temperature`/`top_p`/`top_k`
(it controls depth through `effort` and adaptive thinking instead), while OpenAI and Gemini still
accept them. Check before passing them through a multi-provider layer, and see the
[README volatile table](README.md#5-volatile-facts-as-of-2026-10).

### 1.5 Prompt engineering that actually moves quality

1. **Be explicit about the task, the audience and the output format.** Models follow instructions literally.
2. **Give context and the *why***: "Answer only from the sources, because users act on this for compliance."
3. **Delimit inputs** with XML-ish tags: `<sources>…</sources>`, `<question>…</question>`. It
   separates instructions from data, which is also a prompt-injection defence.
4. **Few-shot examples** for format and edge cases (2–5 diverse ones).
5. **Ask for reasoning before the answer** on hard tasks, or use the model's built-in
   thinking/reasoning mode.
6. **Tell it what to do when it can't**: "If the sources don't contain the answer, say
   `INSUFFICIENT_CONTEXT`." This prevents hallucinated answers.
7. **Version prompts** like code, in files, with an eval run on every change ([10](10-observability-and-evals.md)).

```text
You are a financial analyst assistant for {company}.
Answer the question using ONLY the sources below. Cite each claim as [n].
If the sources don't contain the answer, reply exactly: INSUFFICIENT_CONTEXT.

<sources>
[1] (q3-report.pdf p.4) Revenue grew 18% YoY...
[2] ...
</sources>

<question>{question}</question>
```

---

## 🟡 Level 2: Intermediate (the SDKs, structured output, tool calling)

### 2.1 The same call in three SDKs

**Claude (Anthropic Python SDK):**
```python
from anthropic import Anthropic
client = Anthropic()                                   # ANTHROPIC_API_KEY from env
msg = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    system="You are a concise assistant.",
    messages=[{"role": "user", "content": "Explain RAG in 2 lines."}],
)
text = next(b.text for b in msg.content if b.type == "text")
print(text, msg.usage.input_tokens, msg.usage.output_tokens, msg.stop_reason)
```

**OpenAI (Chat Completions):**
```python
from openai import OpenAI
client = OpenAI()                                      # OPENAI_API_KEY
r = client.chat.completions.create(
    model=OPENAI_MODEL,
    messages=[{"role": "system", "content": "You are a concise assistant."},
              {"role": "user", "content": "Explain RAG in 2 lines."}],
    max_tokens=1024,
)
print(r.choices[0].message.content, r.usage.prompt_tokens, r.usage.completion_tokens)
```
(OpenAI also has the newer **Responses API**, `client.responses.create(model=..., input=...)`,
which is recommended for new agentic work. Know that both exist.)

**Gemini (`google-genai`):**
```python
from google import genai
from google.genai import types
client = genai.Client()                                # GEMINI_API_KEY
r = client.models.generate_content(
    model=GEMINI_MODEL,
    contents="Explain RAG in 2 lines.",
    config=types.GenerateContentConfig(system_instruction="You are a concise assistant.",
                                       max_output_tokens=1024),
)
print(r.text, r.usage_metadata.prompt_token_count)
```

Takeaway: the shapes differ (where the system prompt goes, how usage is named, how tool calls
appear). This is why people use **LangChain's chat model abstraction** ([06](06-agents-langchain-langgraph.md))
or put a gateway in front of every provider, like your AI-ROUTER, which pSEO now calls ([projects/07](projects/07-pseo-engine.md)).

### 2.2 Streaming

```python
with client.messages.stream(model="claude-sonnet-5-5", max_tokens=2048,
                            messages=[{"role": "user", "content": q}]) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()          # full message + usage at the end
```

Stream anything user-facing or long. It improves perceived latency and avoids HTTP timeouts on
large outputs.

### 2.3 Structured output: three tiers

| Tier | How | Guarantee |
|---|---|---|
| 1. Ask nicely | "Reply in JSON with keys a, b" + parse + retry on failure | None. Breaks on preambles and trailing commas |
| 2. JSON mode | Provider flag that ensures syntactically valid JSON | Valid JSON, but the schema isn't guaranteed |
| 3. **Schema-constrained** | Provider enforces your JSON Schema (OpenAI `response_format` json_schema strict, Claude `output_config.format` / `messages.parse`, Gemini `response_schema`) | Valid against the schema |

Even with tier 3, **validate with Pydantic** (business rules like `end_date > start_date` aren't
in the schema), and handle refusals or `max_tokens` truncation.

```python
from pydantic import BaseModel, Field

class Milestone(BaseModel):
    quarter: str = Field(pattern=r"^Q[1-4] \d{4}$")
    goal: str
    kpis: list[str]

class Roadmap(BaseModel):
    summary: str
    milestones: list[Milestone]
    risks: list[str]

resp = client.messages.parse(                    # Claude: validated Pydantic object back
    model="claude-sonnet-5-5", max_tokens=4096,
    messages=[{"role": "user", "content": f"Create a roadmap from this analysis:\n{analysis}"}],
    output_format=Roadmap,
)
roadmap: Roadmap = resp.parsed_output
```

In LangChain it's one line across providers: `llm.with_structured_output(Roadmap)` ([06](06-agents-langchain-langgraph.md)).

### 2.4 Function / tool calling: how it really works

The model **doesn't run anything**. It *asks* you to run a function by emitting a structured
request. You run it and send the result back. Then it continues.

```
1. You send: messages + tools [{name, description, JSON-schema of args}]
2. Model replies: stop_reason = "tool_use", content = [tool_use {id, name, input}]
3. YOU execute name(**input) in your code
4. You send back: the assistant's tool_use turn + a user turn containing tool_result {tool_use_id, content}
5. Model either calls another tool (go to 3) or answers (stop_reason = "end_turn")
```

**Tool definition (Claude):**
```python
tools = [{
    "name": "search_docs",
    "description": "Search the company knowledge base. Use for any question about internal "
                   "policies or products. Returns up to k passages with source and page.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Natural-language search query"},
            "k": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5},
        },
        "required": ["query"],
        "additionalProperties": False,
    },
    "strict": True,                       # model's args are guaranteed to match the schema
}]
```

**Same tool, OpenAI format:** `{"type": "function", "function": {"name", "description", "parameters": {...}}}`.
The result goes back as `{"role": "tool", "tool_call_id": ..., "content": ...}`.

**Tool description = prompt.** Most tool-selection bugs come from a vague description. Say what it
does, *when to use it*, what it returns, and its limits.

### 2.5 The agent loop by hand (write this from memory)

This is the most important code in the track. LangGraph, CrewAI and the SDK "tool runners" are all
wrappers around this loop.

```python
import json
from anthropic import Anthropic
client = Anthropic()

TOOLS_IMPL = {
    "search_docs": lambda query, k=5: retriever.search(query, k),
    "get_metric":  lambda name, period: metrics.get(name, period),
}

def run_agent(question: str, max_steps: int = 8) -> str:
    messages = [{"role": "user", "content": question}]
    for step in range(max_steps):                                  # loop breaker
        resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=4096,
                                      system=SYSTEM, tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": resp.content})   # keep tool_use blocks!

        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")

        results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            try:
                out = TOOLS_IMPL[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": json.dumps(out)[:20_000]})       # cap tool output size
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": f"Error: {e}", "is_error": True})   # let the model recover
        messages.append({"role": "user", "content": results})      # ALL results in ONE message
    return "Stopped: step limit reached."
```

Six things interviewers check in this code:
1. **A max-step cap.** Without it, a confused model loops forever and burns money.
2. **Append the assistant turn including its `tool_use` blocks**, or the API rejects the next call.
3. **Tool errors become `is_error` results**, not crashes, so the model can retry or change approach.
4. **Cap tool output size**, because one huge result blows the context window.
5. **Parallel tool calls:** one response can contain several `tool_use` blocks. Run them
   concurrently (`asyncio.gather`) and return all results in one message.
6. **Validate args** before executing, especially for anything that writes. The model can be wrong,
   or prompt-injected.

The Anthropic SDK also has a **tool runner** (`client.beta.messages.tool_runner(...)` with
`@beta_tool` functions) that runs this loop for you. Write it by hand once so you understand it.

### 2.6 Tool choice

`auto` (the model decides), `none`, or forcing a specific tool. **Volatile:** the newest Claude
models reject forced `tool_choice` (`any`/`tool`). Use `auto` + an instruction + `strict: true`,
or structured output when you only wanted JSON.

---

## 🔴 Level 3: Advanced (production LLM integration)

### 3.1 Optimizing token limits (JD-2: "optimize token limits")

| Technique | What | When |
|---|---|---|
| **Context budgeting** | Fixed budget per section: system 1k, memory 2k, retrieved docs 6k, history 4k, reserve for output | Always. Your UACE context packet does exactly this ([projects/06](projects/06-uace-mcp-server.md)) |
| **History trimming** | Keep the last N turns plus a running summary of older ones | Long chats |
| **Summarize tool outputs** | Store the full result, show the model a summary or top rows | Big SQL/API results |
| **Retrieve, don't stuff** | RAG top-k instead of "paste the whole doc" | Large corpora |
| **Prompt caching** | Stable prefix (system + tools + docs) cached, so ~90% cheaper and faster on reuse | Repeated system prompts, multi-turn, agents |
| **Model routing** | Cheap/fast model for classification, extraction and routing. Strong model for reasoning | Every multi-step system |
| **Ask for brevity** | Output tokens are the expensive and slow part | Always |
| **Count before sending** | Token-count endpoint / `tiktoken` (OpenAI) | Guard against overflow |

**Prompt caching rule:** caching is a **prefix match**. Put stable content first (tools → system →
fixed docs), volatile content last (the user question, timestamps). A `datetime.now()` in the system
prompt silently kills your cache hit rate.

### 3.2 Reliability: retries, timeouts, fallbacks

- **Retry** only retryable errors: 429, 5xx, timeouts and network errors, with exponential backoff and jitter.
  Never retry 400s (a bad request stays bad). The SDKs retry 2× by default.
- **Timeouts per phase**: connect, time-to-first-token, and total. A streaming call needs a TTFT timeout,
  not just a total one.
- **Fallback chain**: primary model → secondary provider → graceful degraded answer. Your pSEO
  router *before* commit `c0c02d1` is a textbook example: DB-ordered chain, typed failover, persisted
  cooldown on 429, and an error type for 200-with-empty-body. That logic now lives in your AI-ROUTER
  gateway ([projects/07](projects/07-pseo-engine.md)).
- **Circuit breaker**: after N failures, stop calling a provider for a cooldown window.

In LangChain: `primary.with_fallbacks([secondary])` and `.with_retry(stop_after_attempt=3)`.

### 3.3 LLM gateway pattern

At company scale, put all model calls behind one internal service (or LiteLLM / Portkey):
provider keys in one place, per-tenant cost attribution, rate limiting, caching, logging/tracing,
model allow-lists and PII redaction. See [genai/08](../genai/08-llmops.md).

### 3.4 Reasoning / thinking models

Modern models can "think" before answering (Claude adaptive thinking with an `effort` level, OpenAI
reasoning models with `reasoning_effort`). They're better at multi-step planning, slower and
cost more. Use them for the **planner** node of an agent and fast models for the **workers**.

### 3.5 Security of tool calling (preview of [07](07-mcp-and-service-integration.md))

- **Least privilege**: give each agent only the tools it needs. Read-only by default.
- **Risk tiers**: read (auto) → write (log) → irreversible such as send, pay or delete (**human approval**).
- **Prompt injection**: retrieved docs, emails and web pages can contain "ignore previous
  instructions…". Treat tool outputs as data. Never let them grant new permissions.
- Validate and authorize every tool call **server-side as the user**, not as a superuser.

---

## 🔧 Integration recipe: provider-agnostic LLM client for your FastAPI app

```python
# app/llm/client.py
from dataclasses import dataclass
from typing import Protocol
from anthropic import AsyncAnthropic, RateLimitError, APIStatusError, APIConnectionError

@dataclass
class LLMResult:
    text: str
    model: str
    input_tokens: int
    output_tokens: int

class LLM(Protocol):
    async def complete(self, system: str, messages: list[dict], max_tokens: int = 1024) -> LLMResult: ...

class ClaudeLLM:
    def __init__(self, model: str = "claude-sonnet-5-5"):
        self.client, self.model = AsyncAnthropic(timeout=60, max_retries=2), model

    async def complete(self, system, messages, max_tokens=1024) -> LLMResult:
        r = await self.client.messages.create(model=self.model, max_tokens=max_tokens,
                                              system=system, messages=messages)
        text = "".join(b.text for b in r.content if b.type == "text")
        return LLMResult(text, self.model, r.usage.input_tokens, r.usage.output_tokens)

class FallbackLLM:
    """Try providers in order; fail over only on retryable errors."""
    def __init__(self, chain: list[LLM]):
        self.chain = chain

    async def complete(self, system, messages, max_tokens=1024) -> LLMResult:
        last: Exception | None = None
        for llm in self.chain:
            try:
                return await llm.complete(system, messages, max_tokens)
            except (RateLimitError, APIConnectionError) as e:
                last = e
            except APIStatusError as e:
                if e.status_code < 500:
                    raise                     # 4xx (not 429): our bug, don't fail over
                last = e
        raise RuntimeError("all providers failed") from last
```

Then record `LLMResult` usage into your `llm_calls` table (see [08](08-databases-and-data-modelling.md))
for cost dashboards.

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| Multi-provider router with fallback and cooldown, later extracted into the AI-ROUTER gateway | pSEO Engine (history) + AI-ROUTER | [projects/07](projects/07-pseo-engine.md) |
| Tool-calling loop with the OpenAI SDK, Python | trading-agent | [projects/02](projects/02-trading-agent.md) |
| Structured output with 7 Zod schemas (`generateObject`) | AgentSystem | [projects/04](projects/04-agent-system.md) |
| Provider wrappers that capture tokens and cost | AI-observability-engine SDK | [projects/01](projects/01-ai-observability-engine.md) |
| Context budget with priority trimming | UACE | [projects/06](projects/06-uace-mcp-server.md) |

## ✅ Self-check

1. Why is an LLM "stateless" and what does that imply for chat apps?
2. Compute the daily cost: 50k calls × (3k in, 400 out) at $2/$10 per MTok.
3. Three tiers of structured output. Why validate with Pydantic even with strict schemas?
4. Write the tool-calling loop from memory with all six safeguards.
5. Where do tool results go in Claude's format vs OpenAI's?
6. Your prompt cache hit rate is 0%. Name three likely causes.
7. Design a fallback chain. Which errors fail over and which raise?
8. How do you stop a tool result from blowing the context window?

## ⚠️ Traps

- Saying "the model calls the API". The model *requests* a call. Your code executes it.
- Retrying on 400 errors.
- Passing `temperature` through a provider-agnostic layer to a model that rejects it.
- Dumping full tool outputs (10k-row SQL results) back into the context.
- No step limit on agent loops.
