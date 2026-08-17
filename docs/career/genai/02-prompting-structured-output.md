# 02 — Prompting & structured output

> The day-to-day craft of an AI product engineer. Also the file with your most embarrassing gap:
> **nothing you own versions its prompts, and nothing caches LLM responses.** Both come up.
>
> The basics of reliable structured output are in
> [interview-qa/07-specialities.md:170](../interview-qa/07-specialities.md). This file goes past
> them into schema mechanics, tool-calling depth, caching cost math and prompt lifecycle.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### Message roles — what belongs where

| Role | Holds | Why it matters |
|---|---|---|
| **System** | Identity, rules, output contract, tool guidance | Stable across turns → **cacheable**. Weighted more heavily than user instructions |
| **User** | The actual request and untrusted content | Anything from outside your trust boundary belongs here, never in system |
| **Assistant** | Prior turns, and prefill when supported | Prefilling the start of the response is a strong format lever |
| **Tool** | Tool results, tagged with the call id | Must be linked to the call that produced it |

**The security rule that follows:** retrieved documents, user files, web pages and tool output are
**data, not instructions**. Put them in user-role content, delimited, and say so explicitly. See
[07-safety-guardrails.md](07-safety-guardrails.md).

### Structuring a prompt

- **Delimit sections clearly.** XML-style tags (`<context>`, `<instructions>`, `<examples>`) work
  well because they're unambiguous about where each section ends — important when the content
  itself contains prose that looks like instructions.
- **Order static → dynamic.** System prompt, tool definitions, then examples, then retrieved
  context, then the user turn. This is a *caching* requirement, not a style preference (below).
- **Positive instructions beat negative.** "Respond in one paragraph" outperforms "don't write
  more than one paragraph" — negations require the model to represent the thing you don't want.
- **Anchor the output format** by showing it, not describing it. One example of the exact shape
  beats a paragraph of description.
- **Put the most important material at the start or end**, never buried mid-context.

**Few-shot examples:** 2–5 is the usual sweet spot. What matters more than count is **coverage of
edge cases** and **consistency of format** — inconsistent examples teach inconsistency. Order
matters (recency bias toward the last example). And examples cost tokens on every call, which is
what makes prompt caching worth so much.

**Chain of thought:** asking for reasoning before the answer improves multi-step tasks. Two
caveats worth knowing: it costs output tokens and latency, and **you should not CoT-prompt a
reasoning model** — it reasons internally, and instructing it to "think step by step" can degrade
it.

### 🔥 Output contracts — the four mechanisms

Ranked by reliability. Know all four and when each fails.

| # | Mechanism | How it works | Fails when |
|---|---|---|---|
| 1 | **Constrained decoding / strict schema mode** | The decoder is masked so only tokens that keep the output schema-valid can be sampled | Provider/model doesn't support it; schema features unsupported (recursion, some unions) |
| 2 | **Tool calling with a JSON Schema** | Define a "tool" whose parameters *are* your output shape, and force it | Model picks the wrong tool, or emits semantically wrong but valid arguments |
| 3 | **JSON mode** | Guarantees *valid JSON*, not your schema | Valid JSON, wrong shape — surprisingly common |
| 4 | **Prompt + parse + validate + repair** | Ask nicely, parse, validate, retry with the error | Free-tier models drift; costs retries |

**The production stack is all of them:** use the strongest the provider supports, validate the
result against your own schema anyway (Zod/Pydantic), and keep a deterministic repair step for the
predictable failures.

**The most important distinction:** *schema-valid* is not *semantically correct*. A model can
return a perfectly-shaped object with a wrong `category` or an invented `total`. **That is an
evals problem, not a parsing problem** — see [04-evals.md](04-evals.md). Saying this unprompted is
a strong signal.

**Deterministic repair — worth doing before you retry**, because it's free:
- Strip a wrapping code fence
- Trim conversational preamble/postscript (slice from the first `{` to the last `}`)
- Remove trailing commas, balance braces

> 🔗 *Yours — two different repair strategies, and you can contrast them:*
>
> **pSEO** (`src/lib/sanitize.ts`) strips a wrapping code fence, but only when the captured inner
> text contains **no further fence** — otherwise it's legitimate prose with an embedded snippet
> and is left alone. The bug it fixes is specific and good: free-tier models sometimes wrap the
> *entire* MDX document in a fence, which then publishes as one literal code block **and** zeroes
> the word count, falsely tripping the thin-content gate.
>
> **Glacier Dev** (`lib/gemini.ts`) does the opposite trick — slices from the first `{` to the
> last `}`, discarding conversational filler on both sides. Different failure mode, cruder cut.

> 🔗 *Yours — the retry design worth describing:* Glacier's `generateJSON` has **two nested
> layers**. The inner loop retries the *same* model up to three attempts and **escalates the
> prompt each time**, appending `CRITICAL: Your previous response was NOT valid JSON… Error was:
> ${error.message}` — feeding the parse error back to the model. Exhausting that throws a
> `ModelUnavailableError`, and the outer layer moves to the next model in the chain.

> 🔗 *Yours — total parsers:* pSEO's Zod schemas use **`.catch()` per field** with `safeParse`, so
> a bad `competitors` field degrades to `[]` rather than failing the whole object, and
> `parseSuggestion` **never throws** — worst case it returns an empty suggestion and the UI falls
> back to manual entry. That's a graceful-degradation contract, not just validation.

> 🔗 *Yours — the strongest version:* AgentSystem uses the Vercel AI SDK's `generateObject` with
> seven Zod schemas and **no manual JSON parsing anywhere**. Note the belt-and-braces though:
> despite schema-constrained generation, the prompts *still* say "NO preamble / NO markdown / start
> with `{`" — evidence of debugging free-model drift.

### 🔥 Function/tool calling — the depth

Beyond "define a tool and the model calls it":

- **`tool_choice`** — `auto` (model decides), `required`/`any` (must call something), `none`
  (disabled for this turn), or a **specific tool forced**. Forcing a specific tool is how you use
  tool-calling as a structured-output mechanism.
- **Parallel tool calls** — a single assistant turn can return several calls. You must execute all
  of them and return **all** results before the next model call, each tagged with its `tool_call_id`.
  A missing result is a protocol error at most providers.
- **Multi-turn tool conversations** — the message history accumulates
  assistant(tool_calls) → tool(results) → assistant(...) pairs. It grows fast, which is why tool
  results should be bounded.
- **Schema authoring constraints** vary by provider: strict modes often require all fields
  `required` (use nullable types instead of optional), disallow recursion, and restrict union
  handling. Descriptions on every field are what the model actually reads.
- **Streaming tool calls** arrive as incremental argument deltas — you cannot parse them until
  complete unless you use an incremental JSON parser. See
  [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md).
- **When arguments are repeatedly invalid**, feed the validation error back as a tool result and
  let the model correct. If that fails twice, the schema or the description is wrong, not the
  model.

> 🔗 *Yours (own the flaw):* trading-agent parses tool arguments with a bare
> `json.loads(tc.function.arguments)` and then splats them: `func(**args)`. A hallucinated
> parameter name raises `TypeError` and **propagates uncaught**. The unknown-*tool* case is
> handled — it returns `{"error": "Unknown tool: ..."}` back to the model — but bad *arguments*
> aren't. That's a precise, fixable gap and naming it is better than hoping.

### 🔥 Prompt caching — mechanics and the cost math

Mechanically, prompt caching reuses the **prefill KV cache** for a shared prefix
([01-foundations.md](01-foundations.md)). Which produces four hard rules:

1. **Only a prefix caches.** Change one token early and everything after it is invalidated.
2. **Order static → dynamic.** System prompt, tool definitions, few-shot examples, long stable
   context — *then* the variable part. Putting a timestamp at the top of your system prompt
   destroys the cache on every call.
3. **There is a minimum cacheable size** (provider-specific, typically ~1k tokens). Below it,
   caching does nothing.
4. **Cache writes cost more than a normal call; cache reads cost far less.** So it pays off across
   repeated calls, not on a one-off.

**The worked math — memorise this shape.** Take a 10k-token stable prefix and a 500-token variable
suffix, with representative multipliers of **1.25× to write** the cache and **0.1× to read** it:

| | Uncached | Cached |
|---|---|---|
| First call | 10,500 units | 10,000 × 1.25 + 500 = 13,000 units |
| Each subsequent call | 10,500 units | 10,000 × 0.1 + 500 = 1,500 units |
| **10 calls total** | **105,000** | **26,500 (~75% saving)** |

Break-even is around the second call. `as of 2026-08` — multipliers and TTL are provider-specific
and change; verify before quoting exact numbers.

**Where it bites in agent loops:** a growing message history means the *prefix* stays stable while
you append — which is the ideal caching shape, and a strong argument for appending rather than
rewriting history.

**Honest gap:** none of your projects use prompt caching. Say so, and say what you'd cache first
(the system prompt and tool definitions in AgentSystem, which makes four calls per task).

### Context budgeting

Allocate explicitly, and **reserve the output first**:

```
window = system + tools + examples + retrieved + history + RESERVED_OUTPUT
```

The classic bug is not reserving output: the prompt fits, generation gets truncated mid-JSON, and
your parser fails on something that looks like a model problem and is a budgeting problem.

**Strategies when you exceed budget:** drop lowest-priority content first with a visible marker,
summarise older history while keeping recent turns verbatim, and truncate tool results rather than
dropping them entirely.

> 🔗 *Yours:* UACE — 6000-char budget, groups appended in priority order (most-relevant → working →
> last session → long-term → session → git commits → active files), lowest priority dropped first
> with a `…trimmed` marker, normalised dedupe so the same fact never appears twice, and the
> semantic highlight section deliberately additive so it doesn't consume the dedupe budget.

> 🔗 *Yours (own it):* Glacier Dev's editor chat concatenates **every project file** into the
> prompt as `--- FILE: {path} ---` with no truncation and no token budget. It works until a project
> gets big, and then it fails hard. That's a real answer to "what would you fix first".

### Prompt lifecycle

**Prompts are deploy artifacts.** They deserve versioning, review and rollback like code — because
a prompt change can degrade quality with nothing failing.

| Approach | Pros | Cons |
|---|---|---|
| **Prompts as code** (in the repo) | Reviewed, versioned, atomic with code changes | Non-engineers can't edit; needs a deploy |
| **Prompt registry / DB** | Editable without deploy; A/B and rollback | Changes bypass code review — dangerous without an eval gate |

**Either way you need:** a version identifier recorded on every request, an eval gate before a
change ships ([04-evals.md](04-evals.md)), and the ability to roll back independently of the app.

> 🔗 *Yours:* pSEO gets **half** of this right. Prompt templates live in a Postgres table, seeded
> with `onConflictDoUpdate` so re-seeding pushes edits to the existing row — the seed is
> deliberately the source of truth, so prompts are effectively code-reviewed. **But there is no
> version column, no history, and no A/B.** A change is a mutation with no way to say which prompt
> produced a given page. That's the gap, and it's build task 3 in
> [00-curriculum.md](00-curriculum.md).

**DSPy** inverts the whole problem: instead of hand-writing prompts, you declare the signature and
a metric, and it optimises the prompt and few-shot selection against that metric. It's genuinely
interesting and it **requires you to have a metric** — which is another way of saying it requires
evals. Worth naming; don't claim it.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

### Prompt craft

**1. What goes in the system prompt vs the user message?**
> System holds identity, rules, the output contract and tool guidance — the stable stuff, which
> also makes it the cacheable prefix. User holds the actual request and, critically, **anything
> from outside my trust boundary**: retrieved documents, uploaded files, web content, tool output.
> Putting untrusted content in the system role is how you hand an attacker system-level authority.

**2. How do you structure a prompt with a lot of context?**
> Delimited sections with unambiguous boundaries — XML-style tags, because the content itself often
> contains prose that reads like instructions and I need a clear terminator. Ordered static to
> dynamic so the prefix is cacheable. Most important material at the start or the end, never buried
> in the middle. And the output format shown as an example rather than described.

**3. How many few-shot examples, and does order matter?**
> Two to five usually. What matters more than count is that they cover the edge cases and are
> formatted identically — inconsistent examples teach inconsistency, and that's the most common
> few-shot mistake I see. Order does matter, there's a recency effect toward the last example, so
> I'd put the most representative one last. And they cost tokens on every call, which is exactly
> what prompt caching is for.

**4. When does chain-of-thought hurt?**
> Two cases. On a reasoning model, because it already reasons internally and an explicit "think
> step by step" can interfere with that. And on simple extraction or classification, where it just
> buys latency and output tokens for no accuracy gain. It earns its cost on multi-step problems.

**5. Why do positive instructions beat negative ones?**
> Because a negation still requires the model to represent the thing you don't want, and
> representing it makes it more available. "Respond in one paragraph" is a target; "don't write
> more than one paragraph" is a target plus a distractor. Same reason "don't mention the price"
> works badly.

### Structured output

**6. 🔥 How do you get reliable structured output?**
> A ladder, using the strongest thing the provider supports and validating anyway. Best is
> constrained decoding or a strict schema mode, where the decoder is masked so only schema-valid
> tokens can be sampled — that makes malformed output structurally impossible. Next is tool calling
> with a JSON Schema and `tool_choice` forcing that tool. Then JSON mode, which guarantees valid
> JSON but *not* your shape. Then prompt-and-parse. Regardless of which I use, I validate against
> Zod or Pydantic on my side, run a deterministic repair pass for the known failures, and retry
> with the validation error fed back — capped.
>
> ↳ **If pushed — the thing people miss:** "Schema-valid isn't semantically correct. A perfectly
> shaped object with a wrong category or an invented total passes every parse check. That's an
> evals problem, not a parsing problem."

**7. What deterministic repair is worth doing before a retry?**
> It's free, so: strip a wrapping code fence, slice from the first `{` to the last `}` to discard
> conversational preamble and postscript, remove trailing commas, balance braces. Each of those
> costs microseconds versus a retry costing a full round-trip and another set of tokens.
>
> 🔗 *Yours:* "I've written two different versions for two different failure modes. In pSEO I
> strip a wrapping fence but **only** if the inner text contains no further fence — otherwise it's
> legitimate prose with an embedded code snippet and unwrapping would corrupt it. In Glacier Dev I
> slice first-brace to last-brace, because there the failure was conversational filler on both
> sides."

**8. Tell me about a structured-output bug you actually hit.**
> In pSEO, free-tier models sometimes wrapped the *entire* generated MDX document in a code fence.
> Stored verbatim that did two things: the page published as one literal code block, and the word
> count went to zero, which falsely tripped my thin-content quality gate — so the symptom looked
> like a content-quality problem, not a parsing one. The fix was the fence-strip with the
> no-inner-fence guard, applied on generate and again on publish.

**9. How do you retry a failed parse?**
> Feed the error back. Re-prompting the same model with "your previous response was not valid JSON,
> the error was X" works surprisingly well, capped at two or three attempts. Beyond that the model
> isn't going to get there and I fall through to a different model.
>
> 🔗 *Yours:* "Glacier Dev nests exactly that — an inner loop retrying the same model three times
> with the parse error escalated into the prompt each attempt, and an outer loop that moves to the
> next model in the chain when the inner one is exhausted."

**10. What's the risk of an unchecked cast on model output?**
> That valid JSON with the wrong shape sails straight through into your business logic and fails
> somewhere far away with a confusing error. TypeScript's `as` does nothing at runtime.
>
> 🔗 *Yours (own it):* "Glacier Dev does exactly this — `as ArchitectOutput` with no Zod. It's the
> biggest honest weakness in that repo. AgentSystem is the opposite: `generateObject` with a Zod
> schema everywhere, no manual parsing at all."

**11. What does `.catch()` on a Zod field buy you?**
> Field-level graceful degradation. A malformed `competitors` array degrades to an empty array
> instead of failing the entire object, so one bad field doesn't cost me the whole response.
> Combined with `safeParse` it makes the parser **total** — it never throws, worst case it returns
> an empty result and the UI falls back to manual entry. That's a deliberate product contract: the
> AI routes never 500, they return 200 with a reason so the form degrades gracefully.

### Tool calling

**12. 🔥 Explain `tool_choice`.**
> It controls whether and which tool gets called. `auto` lets the model decide. `required` or `any`
> forces it to call *something*, which is useful when a bare text answer is never valid. `none`
> disables tools for that turn — handy when you want a summary of what just happened without more
> calls. And forcing a *specific* tool is how you use tool calling as a structured-output
> mechanism: define a tool whose parameters are your output schema and force it.

**13. What are parallel tool calls and what's the gotcha?**
> One assistant turn can return multiple tool calls at once, which is a real latency win for
> independent lookups. The gotcha is protocol: you must execute all of them and return **every**
> result, each tagged with its `tool_call_id`, before the next model call. A missing result is an
> error at most providers, and it's easy to get wrong if you're mapping over calls and swallowing
> an exception.

**14. How do you validate tool arguments?**
> Against the same schema I gave the model, on my side, before execution — because the schema
> constrains but doesn't guarantee, and because a tool that executes hallucinated arguments is a
> security problem, not just a bug. On failure I return the validation error as the tool result and
> let the model correct.
>
> 🔗 *Yours (own it):* "trading-agent doesn't do this. It does `json.loads` then `func(**args)`,
> so a hallucinated parameter name raises a `TypeError` that propagates uncaught. The unknown-tool
> case *is* handled — it returns an error back to the model — but bad arguments aren't. It's a
> precise gap and a small fix."

**15. Provider strict-schema modes have restrictions. Which bite?**
> Usually: every field must be `required`, so optionality is expressed as a nullable type rather
> than an absent key; recursion is disallowed, so tree-shaped outputs need flattening or a
> bounded depth; and unions are limited. The practical effect is that a schema which validates
> fine in Zod may be rejected by the provider, so I keep the wire schema and the internal schema
> separate rather than assuming they're the same object.

### Caching and budgeting

**16. 🔥 Explain prompt caching and the cost math.**
> Mechanically it reuses the prefill KV cache for a shared prefix, which is why only a *prefix*
> caches — the KV state is causal, so changing anything early invalidates everything after it.
> Practically: order the prompt static to dynamic, keep the system prompt and tool definitions
> above the variable content, and know there's a minimum cacheable size.
>
> The math: writing the cache costs more than a normal call, reading it costs far less. With a 10k
> stable prefix and a 500-token variable suffix, ten calls uncached is about 105k token-units;
> cached it's roughly 13k for the first call and 1.5k for each of the other nine — about 26.5k, so
> around a 75% saving. Break-even is the second call.
>
> **Honest gap:** "None of my projects use it. The first place I'd apply it is AgentSystem, which
> makes about four model calls per task against a stable system prompt."

**17. What destroys your cache hit rate?**
> Anything variable near the top. A timestamp in the system prompt, a per-user greeting before the
> instructions, reordering tool definitions, or rewriting conversation history rather than
> appending to it. The last one is why agent loops that append are naturally cache-friendly and
> ones that rebuild the message list aren't.

**18. 🔥 How do you budget the context window?**
> Explicitly, and I reserve the output allocation **first** — system plus tools plus examples plus
> retrieved context plus history, with a fixed reserve for generation. The classic bug is not
> reserving: the prompt fits, generation truncates mid-JSON, and it looks like a model problem when
> it's an arithmetic problem. When I'm over budget I drop lowest-priority content first with a
> visible marker, summarise older turns while keeping recent ones verbatim, and truncate tool
> results rather than dropping them.
>
> 🔗 *Yours:* "UACE does this concretely — 6000 characters, priority-ordered groups, lowest dropped
> first with a `…trimmed` marker, plus normalised dedupe so the same fact never appears twice."

**19. What would you fix in Glacier Dev's context handling?**
> It concatenates every project file into the editor chat prompt with no truncation and no budget.
> It works on a small project and falls over hard on a large one. The fix is the obvious one —
> retrieve the relevant files rather than sending all of them, and budget what's left. It's a good
> illustration that "just put it all in context" is a strategy with a cliff, not a gradient.

### Lifecycle

**20. 🔥 How do you version prompts?**
> Prompts are deploy artifacts and should be versioned, reviewed and rollback-able like code,
> because a prompt change can degrade quality with nothing failing. Either in the repo — reviewed
> and atomic with code, but requires a deploy — or in a registry, editable without deploy but
> bypassing code review, which is only safe with an eval gate. Either way I want a version id
> recorded on every request so I can attribute an output to the prompt that produced it, and an
> eval run before the change ships.
>
> **Honest gap, say it plainly:** "pSEO gets half of this. Templates live in a Postgres table
> seeded with an upsert, so the seed file is effectively the reviewed source of truth. But there's
> **no version column, no history, no A/B** — a change is a mutation and I can't tell you which
> prompt produced a given page. That's the single most embarrassing gap across my projects and I
> know exactly what fixing it looks like."

**21. Who should own prompt changes?**
> Engineering owns the mechanism and the gate; whoever owns quality can own the content — but only
> if every change runs through an eval before it ships. A registry that lets a PM edit production
> prompts with no eval is a quality outage waiting to happen. It's the same argument as letting
> someone deploy without CI.

**22. What is DSPy?**
> It treats prompts as parameters to optimise rather than text to write — you declare the input/
> output signature and a metric, and it searches over prompts and few-shot selections to maximise
> that metric. The interesting consequence is that it *requires* you to have a metric, which means
> it requires evals. I haven't shipped it, but the framing is right: hand-tuning prompts by
> eyeballing outputs is the same superstition as tuning retrieval by eye.

**23. Your prompt works on GPT and fails on Llama. What do you do?**
> Accept that prompts are model-specific and stop trying to write one that works everywhere.
> Concretely: pin a prompt version per model in the registry, keep the schema and validation
> shared, and lean harder on structural mechanisms — a smaller model needs constrained decoding or
> tool-calling far more than a frontier model needs it. And re-run the eval per model rather than
> assuming a prompt improvement transfers.
>
> 🔗 *Yours:* "This is why my routers matter — pSEO has six models across three providers in one
> ordered chain, and free-tier models drift in exactly this way. It's also why AgentSystem's
> prompts still say 'no preamble, start with `{`' even though it uses schema-constrained
> generation: belt and braces, because free models drift."

---

## Rapid-fire

| Term | One-liner |
|---|---|
| System prompt | Stable identity, rules, contract — and the cacheable prefix |
| Untrusted content | Retrieved docs, files, tool output — user role, delimited, never system |
| Prefill (assistant) | Seeding the start of the response to force a format |
| Few-shot | 2–5 examples; consistency matters more than count |
| CoT | Reason before answering; skip it on reasoning models |
| Constrained decoding | Decoder masked so only schema-valid tokens sample |
| JSON mode | Valid JSON guaranteed; your schema is not |
| Tool-as-schema | Force a tool whose params are your output shape |
| `tool_choice` | auto / required / none / a specific tool |
| Parallel tool calls | Several calls in one turn — return *all* results |
| `tool_call_id` | Links a result to the call that requested it |
| Schema-valid ≠ correct | The distinction that makes it an evals problem |
| JSON repair | Fence strip, brace slice, trailing commas — free before a retry |
| Error-feedback retry | Re-prompt with the validation error text |
| Zod `.catch()` | Field-level degradation instead of whole-object failure |
| Total parser | Never throws — worst case returns an empty result |
| Prompt caching | Reuse of the prefill KV cache for a shared prefix |
| Cache write/read | Write costs more than normal, read far less; break-even ~2 calls |
| Static-to-dynamic | Prompt ordering rule that makes caching possible |
| Reserved output | Budget generation *before* filling the window |
| Prompt registry | Prompts in a DB — editable without deploy, needs an eval gate |
| Prompt version id | Recorded per request, so output attributes to a prompt |
| DSPy | Optimise prompts against a metric instead of writing them |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| Fence-strip repair with a guard | pSEO | "Only unwrap if there's no inner fence — otherwise it's prose with a snippet and unwrapping corrupts it." |
| The bug behind it | pSEO | "A fully-fenced document published as a code block *and* zeroed the word count, falsely tripping the thin-content gate." |
| Total parsers | pSEO | "`.catch()` per field plus `safeParse` — the AI routes never 500, they return a reason and the UI falls back to manual entry." |
| Two-layer JSON retry | Glacier Dev | "Inner loop re-prompts the same model with the parse error; outer loop falls through to the next model." |
| Unchecked casts | Glacier Dev | "`as ArchitectOutput` with no runtime validation — the biggest honest weakness in that repo." |
| Schema-constrained everywhere | AgentSystem | "`generateObject` with seven Zod schemas and no manual JSON parsing at all." |
| Belt-and-braces prompting | AgentSystem | "Prompts still say 'no preamble, start with `{`' despite constrained generation — free models drift." |
| Native tool calling | trading-agent | "Hand-written OpenAI-format schemas with `enum` constraints, and descriptions written as prompts because that's how the model decides." |
| Unvalidated tool args | trading-agent | "`func(**args)` — a hallucinated parameter name raises uncaught. Precise gap, small fix." |
| Structured system prompt | trading-agent | "Fifty lines in four sections — timeframe routing, symbol convention, an intent→tool map, and hard rules including 'never invent numbers'." |
| Context budgeting | UACE | "6000 chars, priority-ordered, lowest dropped first with a trim marker, deduped." |
| Tool description as prompt | UACE | "Tool naming and descriptions mattered more than model choice." |
| Prompts as data | pSEO | "Templates in Postgres, seeded with an upsert so the seed is the source of truth — but no version column, and that's the gap." |
| Context without a budget | Glacier Dev | "Every project file concatenated into the prompt, untruncated. Works small, fails hard." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Prompt versioning** | "Nothing I own versions prompts. pSEO gets halfway — templates in a table with the seed as source of truth — but no version column, no history, no A/B. I know exactly what fixing it looks like." |
| **Prompt caching** | "Haven't used it. I understand the mechanism — prefill KV reuse on a shared prefix — and I'd apply it first to AgentSystem, which makes four calls per task against a stable prompt." |
| **A/B testing prompts** | "No production traffic at that volume. I'd need an eval gate before the A/B, not instead of it." |
| **Constrained decoding / strict mode** | "I've used the AI SDK's `generateObject`, which does schema-constrained generation, and native tool calling. I haven't used a provider strict-schema mode directly." |
| **DSPy** | "Read it, haven't shipped it. It requires a metric, which is the honest barrier." |
| **LLM response caching** | "None of my projects cache LLM responses. trading-agent caches *market data* with a TTL so scanning 50 symbols doesn't hammer Yahoo — that's the same instinct applied one layer down." |

---

## What's NOT here

| Topic | Doc |
|---|---|
| Tokenization, sampling params, KV cache mechanics | [01-foundations.md](01-foundations.md) |
| Why schema-valid-but-wrong is an evals problem | [04-evals.md](04-evals.md) |
| Tool *design* — scoping, errors, authorisation | [05-agents.md](05-agents.md) |
| Streaming tool-call deltas, partial JSON parsing | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) |
| Untrusted content and injection defence | [07-safety-guardrails.md](07-safety-guardrails.md) |
| Cost attribution and gateways in production | [08-llmops.md](08-llmops.md) |
| Basic structured-output Q&A | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |

---

← Back to [INDEX.md](INDEX.md)
