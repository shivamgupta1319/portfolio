# 12 — AI machine coding

> Eight drills, 60–90 minutes each. **Every solution in this file was executed against its tests
> before it shipped here** — same standard as
> [interview-qa/09–10](../interview-qa/09-coding-arrays-strings.md).
>
> The classic OOP drills (Splitwise, parking lot, LRU) are in
> [system-design-prep.md](../system-design-prep.md) §B. These are the AI-shaped ones, and they
> increasingly replace or supplement the LLD round at AI-native companies.

---

## What this round actually grades

Not algorithmic cleverness. Four things:

| # | Criterion | What it looks like |
|---|---|---|
| 1 | **Correctness** | It runs and handles the demo cases |
| 2 | **Failure handling** | What happens on a bad tool call, a 429, an empty response, a client disconnect |
| 3 | **Cost awareness** | Budgets, caps, caching, over-fetch — you talk about tokens unprompted |
| 4 | **Testability** | Injected clock, injected model, no global state. **The single biggest tell** |

**The senior move in every one of these:** inject `now()`, inject the model/embedder, and never
call `Date.now()` inside the logic. Interviewers notice immediately, because it's what lets you
write a test in front of them.

**Priority order if you're short on time:** 1 (agent loop) → 4 (resilient client) → 6 (hybrid +
RRF) → 2 (TPM limiter). Those four cover the most ground.

---

## Drill 1 — Agent loop from scratch

> *"Implement an agent loop: given a model function and a set of tools, run until the model
> answers or a limit is hit."*

**Scope 60 min:** registry, loop, unknown-tool handling, max steps.
**Scope 90 min:** + argument validation, parallel calls, token budget, loop detection, events.

**What's being graded:** do you return **all** tool results in the same turn; do errors go back to
the model instead of throwing; is there more than one kind of limit.

```js
class ToolRegistry {
  #tools = new Map();
  register(tool) {
    if (this.#tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
    this.#tools.set(tool.name, tool);
    return this;
  }
  get(name) { return this.#tools.get(name); }
  schemas() {
    return [...this.#tools.values()].map(({ name, description, parameters }) =>
      ({ name, description, parameters }));
  }
}

async function runAgent({ model, registry, messages, maxSteps = 8, tokenBudget = Infinity, onEvent = () => {} }) {
  let spent = 0;
  const seen = new Map();

  for (let step = 0; step < maxSteps; step++) {
    if (spent >= tokenBudget) return { status: 'budget_exhausted', messages, spent };

    const reply = await model({ messages, tools: registry.schemas() });
    spent += reply.usage?.total ?? 0;
    messages.push({ role: 'assistant', content: reply.content ?? null, tool_calls: reply.tool_calls });

    // No tool calls means the model answered. That is the stopping condition.
    if (!reply.tool_calls?.length) {
      return { status: 'ok', answer: reply.content, messages, spent, steps: step + 1 };
    }

    // Every call in a turn must get a result, in the same turn, tagged with its id.
    const results = await Promise.all(reply.tool_calls.map(async (call) => {
      onEvent({ type: 'tool_call', name: call.name });

      const sig = `${call.name}:${JSON.stringify(call.arguments)}`;
      seen.set(sig, (seen.get(sig) ?? 0) + 1);
      if (seen.get(sig) > 2) {
        return { tool_call_id: call.id, role: 'tool',
                 content: 'Error: repeated identical call; try a different approach.' };
      }

      const tool = registry.get(call.name);
      if (!tool) {
        return { tool_call_id: call.id, role: 'tool',
                 content: `Error: unknown tool "${call.name}". Available: ${registry.schemas().map(t => t.name).join(', ')}` };
      }

      const parsed = tool.validate(call.arguments);
      if (!parsed.ok) {
        return { tool_call_id: call.id, role: 'tool',
                 content: `Error: invalid arguments — ${parsed.error}` };
      }

      try {
        return { tool_call_id: call.id, role: 'tool',
                 content: JSON.stringify(await tool.execute(parsed.value)) };
      } catch (err) {
        return { tool_call_id: call.id, role: 'tool', content: `Error: ${err.message}` };
      }
    }));

    messages.push(...results);
  }

  return { status: 'max_steps', messages, spent };
}
```

**Say these while you write:**
- "Errors go back to the model as tool results, not thrown — the model is the error handler, and a
  readable error lets it recover on the next turn."
- "Arguments get validated before execution. Splatting unvalidated model output into a function is
  a security problem, not just a bug." *(This is the real bug in your own trading-agent — own it if
  asked.)*
- "Three limits, because they catch different failures: step count, token budget, and repeated
  identical calls. Step count is a poor proxy for cost."

**The last-10-minutes extension:** parallel tool execution (already here), or a per-tool timeout.

**Common failure:** returning only the first tool result when the model made three calls. Most
providers reject the next request with a protocol error.

---

## Drill 2 — TPM + RPM rate limiter

> *"Rate-limit LLM calls by both requests-per-minute and tokens-per-minute. You only know the
> real token count after the call."*

**What's being graded:** do you realise you must **reserve on an estimate and reconcile on the
actual**. That reserve/settle insight is the whole drill.

```js
class RateLimiter {
  constructor({ rpm, tpm, now = () => Date.now() }) {
    this.rpm = rpm; this.tpm = tpm; this.now = now;
    this.reqTokens = rpm; this.tokTokens = tpm;
    this.last = now();
  }

  #refill() {
    const t = this.now();
    const elapsed = (t - this.last) / 60_000;
    if (elapsed <= 0) return;
    this.reqTokens = Math.min(this.rpm, this.reqTokens + elapsed * this.rpm);
    this.tokTokens = Math.min(this.tpm, this.tokTokens + elapsed * this.tpm);
    this.last = t;
  }

  /** Reserve against an ESTIMATE. Returns a settle() to reconcile with actual usage. */
  tryReserve(estimatedTokens) {
    this.#refill();

    if (this.reqTokens < 1 || this.tokTokens < estimatedTokens) {
      const needTok = ((estimatedTokens - this.tokTokens) / this.tpm) * 60_000;
      const needReq = ((1 - this.reqTokens) / this.rpm) * 60_000;
      return { ok: false, retryAfterMs: Math.ceil(Math.max(0, needTok, needReq)) };
    }

    this.reqTokens -= 1;
    this.tokTokens -= estimatedTokens;

    return {
      ok: true,
      settle: (actualTokens) => {
        // Refund an over-estimate, charge an under-estimate. Never refund past the cap.
        this.tokTokens = Math.min(this.tpm, this.tokTokens + (estimatedTokens - actualTokens));
      },
    };
  }
}
```

**Say these while you write:**
- "Two buckets, because providers limit both and they bind independently — you can have request
  headroom and no token headroom."
- "I reserve on a pre-flight estimate and settle with the real usage afterwards. Without the
  reserve, N concurrent requests all pass the check and blow the limit together."
- "`retryAfterMs` is computed, not guessed — the caller can back off precisely instead of polling."

**Extension:** a fair queue so one tenant can't starve others, or priority lanes for interactive
traffic over batch.

---

## Drill 3 — Semantic cache

> *"Cache LLM responses by semantic similarity of the query."*

**What's being graded:** whether you spot the danger. A semantic cache that crosses users is a data
leak. If you don't raise scoping unprompted, you've failed the interesting half.

```js
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

class SemanticCache {
  constructor({ embed, threshold = 0.95, ttlMs = 300_000, max = 1000, now = () => Date.now() }) {
    Object.assign(this, { embed, threshold, ttlMs, max, now });
    this.entries = [];                       // { scope, vec, value, expires }
  }

  #live() {
    const t = this.now();
    this.entries = this.entries.filter((e) => e.expires > t);
    return this.entries;
  }

  async get(scope, query) {
    const vec = await this.embed(query);
    let best = null;
    for (const e of this.#live()) {
      if (e.scope !== scope) continue;       // never match across tenants or users
      const sim = cosine(vec, e.vec);
      if (sim >= this.threshold && (!best || sim > best.sim)) best = { sim, value: e.value };
    }
    return best ? { hit: true, value: best.value, similarity: best.sim } : { hit: false, vec };
  }

  async set(scope, query, value, vec) {
    const v = vec ?? (await this.embed(query));
    this.#live();
    if (this.entries.length >= this.max) this.entries.shift();
    this.entries.push({ scope, vec: v, value, expires: this.now() + this.ttlMs });
  }

  invalidateScope(scope) {
    this.entries = this.entries.filter((e) => e.scope !== scope);
  }
}
```

**Say these while you write:**
- "Scope is a first-class key, not an afterthought. 'What's my balance' is the canonical disaster —
  two users, near-identical embeddings, completely different correct answers."
- "The threshold is high — 0.95 — because a false hit serves a confidently wrong answer, which is
  worse than a cache miss. I'd tune it against real query pairs, not guess."
- "`get` returns the computed vector on a miss so the caller doesn't embed twice."

**Extension:** swap the linear scan for an ANN index and explain why the recall/latency tradeoff
now matters, or add cache-hit-rate and false-hit metrics.

---

## Drill 4 — Resilient LLM client

> *"Wrap LLM calls with timeouts, retries, a circuit breaker and provider fallback."*

**What's being graded:** does your retry policy distinguish retryable from non-retryable, and does
a 4xx fail fast instead of burning the whole chain.

```js
class CircuitBreaker {
  constructor({ threshold = 3, resetMs = 30_000, now = () => Date.now() }) {
    Object.assign(this, { threshold, resetMs, now });
    this.failures = 0; this.openedAt = null;
  }
  get open() {
    if (this.openedAt === null) return false;
    if (this.now() - this.openedAt >= this.resetMs) { this.openedAt = null; this.failures = 0; return false; }
    return true;
  }
  success() { this.failures = 0; this.openedAt = null; }
  failure() { if (++this.failures >= this.threshold) this.openedAt = this.now(); }
}

class HttpError extends Error { constructor(status) { super(`HTTP ${status}`); this.status = status; } }
class EmptyOutputError extends Error { constructor() { super('empty output'); } }

const retryable = (err) =>
  err instanceof EmptyOutputError ||
  err.name === 'TimeoutError' ||
  err.code === 'ECONNRESET' ||
  (err instanceof HttpError && (err.status === 429 || err.status >= 500));

async function callWithFallback({ chain, call, attemptsPerModel = 2, baseDelayMs = 100,
                                  sleep, rand = Math.random, now = () => Date.now() }) {
  const errors = [];

  for (const model of chain) {
    model.breaker ??= new CircuitBreaker({ now });
    if (model.breaker.open) { errors.push(`${model.id}: circuit open`); continue; }
    if (model.cooldownUntil && model.cooldownUntil > now()) { errors.push(`${model.id}: cooling down`); continue; }

    for (let attempt = 0; attempt < attemptsPerModel; attempt++) {
      try {
        const out = await call(model);
        if (!out || !out.trim()) throw new EmptyOutputError();   // 200 with an empty body is a failure
        model.breaker.success();
        return { output: out, model: model.id, attempts: attempt + 1 };
      } catch (err) {
        if (!retryable(err)) { model.breaker.failure(); throw err; }  // 4xx: fail fast

        model.breaker.failure();
        if (err instanceof HttpError && err.status === 429) {
          model.cooldownUntil = now() + 60_000;                       // persist; skip on later calls
          break;
        }
        errors.push(`${model.id}: ${err.message}`);
        if (attempt < attemptsPerModel - 1) {
          await sleep(baseDelayMs * 2 ** attempt * (0.5 + rand() / 2));   // exponential + jitter
        }
      }
    }
  }

  throw new Error(`chain exhausted: ${errors.join('; ')}`);
}
```

**Say these while you write:**
- "A 400 means my request is malformed — retrying it or trying another provider wastes time and
  money. Only 429, 5xx, timeouts, network errors and empty output are retryable."
- "**Empty output needs its own error type.** Free-tier providers return HTTP 200 with an empty
  body, and if you don't treat that as a failure you ship blank content." 🔗 *This is real —
  `EmptyOutputError` exists in pSEO for exactly this reason.*
- "The 429 cooldown is written onto the model, not held in a local variable, so every instance
  shares it. In production I'd persist it to the database — I've done exactly that."
- "Jitter, because synchronised retries from many instances are how you turn a blip into an
  outage."

**Extension:** phase-specific timeouts — a TTFT timeout separate from the total timeout, because
with streaming a slow first token and a long generation are different failures.

---

## Drill 5 — Chunker

> *"Split documents into chunks under a token budget, on meaningful boundaries, with overlap."*

**What's being graded:** recursive separator fallback, and handling the pathological input — text
with no separators at all.

```js
const estimateTokens = (s) => Math.ceil(s.length / 4);

function chunkText(text, { maxTokens = 100, overlapTokens = 20,
                           separators = ['\n\n', '\n', '. ', ' '] } = {}) {
  const split = (s, depth) => {
    if (estimateTokens(s) <= maxTokens) return s.trim() ? [s] : [];

    const sep = separators[depth];
    if (sep === undefined) {                       // no separator left: hard cut
      const size = maxTokens * 4;
      const out = [];
      for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
      return out;
    }

    const parts = s.split(sep);
    if (parts.length === 1) return split(s, depth + 1);

    // Greedily pack parts back up to the budget, then recurse on anything still too big.
    const packed = [];
    let buf = '';
    for (const part of parts) {
      const candidate = buf ? buf + sep + part : part;
      if (estimateTokens(candidate) > maxTokens && buf) { packed.push(buf); buf = part; }
      else buf = candidate;
    }
    if (buf) packed.push(buf);

    return packed.flatMap((p) => (estimateTokens(p) > maxTokens ? split(p, depth + 1) : [p]));
  };

  const pieces = split(text, 0).filter((p) => p.trim().length > 0);

  return pieces.map((p, i) => {
    if (i === 0 || overlapTokens === 0) return { text: p, tokens: estimateTokens(p), index: i };
    const tail = pieces[i - 1].slice(-overlapTokens * 4);
    const withOverlap = `${tail}${p}`;
    return { text: withOverlap, tokens: estimateTokens(withOverlap), index: i };
  });
}
```

**Say these while you write:**
- "Recursive separators in priority order — paragraph, line, sentence, word — so I only break at a
  finer boundary when the coarser one doesn't fit."
- "The greedy repack matters: naive splitting on `\n\n` gives you one chunk per paragraph, which
  wastes the budget when paragraphs are short."
- "There's always a hard-cut fallback. A 10,000-character run with no whitespace has to terminate,
  and forgetting that is how a chunker hangs."
- "The token count is an estimate on purpose. Real tokenisation at index time costs more than the
  heuristic budget it feeds is worth." 🔗 *`len/3.6` measured on source code in repo-intelligence.*

**Extension:** carry metadata (source, section heading, position, content hash) onto each chunk —
and say why: the content hash is what gives you incremental re-indexing.

---

## Drill 6 — Hybrid retrieval with RRF

> *"Combine BM25 and vector search into one ranked list, with a metadata filter."*

**What's being graded:** knowing **why** you fuse by rank rather than by score, and applying the
filter before search rather than after.

```js
function bm25(docs, query, { k1 = 1.5, b = 0.75 } = {}) {
  const tok = (s) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const terms = tok(query);
  const N = docs.length;
  const lens = docs.map((d) => tok(d.text).length);
  const avg = lens.reduce((a, c) => a + c, 0) / N;

  const df = new Map();
  for (const d of docs) for (const t of new Set(tok(d.text))) df.set(t, (df.get(t) ?? 0) + 1);

  return docs.map((d, i) => {
    const words = tok(d.text);
    let score = 0;
    for (const t of terms) {
      const f = words.filter((w) => w === t).length;
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * lens[i]) / avg)));
    }
    return { id: d.id, score };
  }).filter((r) => r.score > 0).sort((a, b2) => b2.score - a.score);
}

/** Fuse ranked lists by reciprocal rank. Scale-free, unlike adding raw scores. */
function rrf(lists, { k = 60, limit = 10 } = {}) {
  const scores = new Map();
  for (const [name, { ids, weight = 1 }] of Object.entries(lists)) {
    ids.forEach((id, rank) => {
      const cur = scores.get(id) ?? { score: 0, sources: [] };
      cur.score += weight / (k + rank + 1);
      cur.sources.push(name);
      scores.set(id, cur);
    });
  }
  return [...scores.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}

async function hybridSearch({ docs, query, embed, filter = () => true, limit = 5, overfetch = 5 }) {
  const pool = docs.filter(filter);                         // pre-filter, not post-filter
  const lexical = bm25(pool, query).slice(0, limit * overfetch).map((r) => r.id);
  const qv = await embed(query);
  const dense = pool
    .map((d) => ({ id: d.id, sim: cosine(qv, d.vec) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit * overfetch)
    .map((r) => r.id);
  return rrf({ lexical: { ids: lexical }, dense: { ids: dense } }, { limit });
}
```

**Say these while you write:**
- "RRF rather than weighted score addition, because BM25 is unbounded and corpus-dependent while
  cosine sits in [-1, 1]. There's no common scale, so any weights I pick are fitted to one corpus."
- "The property that makes it work: a document in both lists outranks one topping either alone.
  Agreement between independent retrievers is stronger evidence than excellence in one."
- "The filter is applied **before** search. Post-filtering collapses recall — fetch ten, discard
  nine, return one."
- "Ties break deterministically by id, so results are stable across runs. That matters for
  snapshot tests."

**Extension:** add a rerank stage over the fused top-50 and explain the bi-encoder/cross-encoder
tradeoff.

---

## Drill 7 — SSE endpoint with cancellation

> *"Stream tokens over SSE. Handle client disconnect, heartbeats, and errors after headers are
> sent."*

**What's being graded:** realising you **cannot return a 500 once you've sent a 200**, and
propagating cancellation so you stop paying for tokens nobody will read.

```js
function sseFormat(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function* streamAnswer({ tokens, signal, heartbeatEvery = 3 }) {
  let sent = 0;
  try {
    for (const tok of tokens) {
      if (signal?.aborted) { yield sseFormat('aborted', { sent }); return; }
      yield sseFormat('token', { text: tok });
      if (++sent % heartbeatEvery === 0) yield ': keep-alive\n\n';   // comment frame
    }
    yield sseFormat('done', { sent });
  } catch (err) {
    // Headers are long gone — a 500 is impossible. The error has to be an event.
    yield sseFormat('error', { message: err.message, sent });
  }
}
```

Wiring it up (Express-shaped):

```js
app.get('/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',          // or nginx buffers the whole stream
  });

  const ctl = new AbortController();
  req.on('close', () => ctl.abort());   // client hung up → stop generating, stop paying

  for await (const chunk of streamAnswer({ tokens: upstream, signal: ctl.signal })) {
    if (!res.write(chunk)) await once(res, 'drain');   // backpressure
  }
  res.end();
});
```

**Say these while you write:**
- "Once I've written the 200 and the headers, an error can't be a status code — it has to be an
  error *event*, and the client needs to handle it. That's the bit people miss."
- "`req.on('close')` → abort → propagate to the provider. Without that you keep generating tokens
  for a browser tab that's gone, and you pay for all of them."
- "`X-Accel-Buffering: no` and `no-transform`, or nginx buffers the entire response and it works
  perfectly on localhost and looks broken in production."
- "Heartbeat comment frames keep intermediaries from timing out an idle connection."

**Extension:** resumability with `Last-Event-ID`, which needs a generation id and stored output.

---

## Drill 8 — Context budget manager

> *"Assemble a prompt from prioritised content groups within a token budget."*

**What's being graded:** reserving the output allocation, dropping by priority, and making
trimming **visible**.

```js
function assembleContext({ budget, reserveOutput, groups, count = estimateTokens }) {
  const available = budget - reserveOutput;
  if (available <= 0) throw new Error('reserveOutput exceeds budget');

  const ordered = [...groups].sort((a, b) => a.priority - b.priority);
  const seen = new Set();
  const included = [];
  let used = 0;
  let trimmed = false;

  for (const group of ordered) {
    const kept = [];
    for (const item of group.items) {
      const key = item.trim().toLowerCase();
      if (seen.has(key)) continue;                        // dedupe across groups
      const cost = count(item);

      if (used + cost > available) {
        if (group.truncatable && available - used > 20) { // truncate rather than drop
          kept.push(`${item.slice(0, (available - used) * 4)}…[truncated]`);
          used = available;
        }
        trimmed = true;
        break;
      }

      seen.add(key);
      kept.push(item);
      used += cost;
    }
    if (kept.length) included.push({ name: group.name, items: kept });
    if (kept.length < group.items.length) trimmed = true;
  }

  const text =
    included.map((g) => `## ${g.name}\n${g.items.join('\n')}`).join('\n\n') +
    (trimmed ? '\n\n…trimmed' : '');

  return { text, used, available, trimmed, groups: included.map((g) => g.name) };
}
```

**Say these while you write:**
- "**Reserve the output allocation first.** The classic bug is a prompt that fits, generation that
  truncates mid-JSON, and a parse failure that looks like a model problem and is arithmetic."
- "Priority order, lowest dropped first, and the trim is **marked**. Silently dropping context
  produces answers that are wrong for invisible reasons."
- "Dedupe across groups — the same fact arriving from retrieval and from history shouldn't be paid
  for twice." 🔗 *UACE does exactly this, normalised-lowercase, against a 6000-char budget.*

**Extension:** summarise dropped history with a cheap model instead of discarding it, and note
that you now have a latency/cost tradeoff to justify.

---

## Rapid-fire — what to say in every drill

| Moment | The line |
|---|---|
| Constructor | "Clock and model are injected so I can test this deterministically." |
| Any retry | "Only retryable errors — a 400 means my request is wrong." |
| Any limit | "Steps are a poor proxy for cost; I want a token budget too." |
| Any cache | "Scope is part of the key. Cross-user cache hits are a data leak." |
| Any fusion | "Rank-based, because the two score scales aren't comparable." |
| Any filter | "Pre-filter — post-filtering collapses recall." |
| Any stream | "Once headers are sent an error is an event, not a status." |
| Any budget | "Output allocation reserved before anything else is packed." |
| Tool errors | "Back to the model as text — the model is the error handler." |
| Trimming | "Visible, never silent." |

---

## Practice protocol

Real 90-minute timer. Working code with tests over complete code without them — the round grades
whether it runs and whether you handled failure, not whether every extension landed.

| Week | Drill | Why this order |
|---|---|---|
| 1 | 1 — Agent loop | Most likely to be asked |
| 2 | 4 — Resilient client | Second most likely; you've built it |
| 3 | 6 — Hybrid + RRF | Core RAG competence |
| 4 | 2 — TPM limiter | The reserve/settle insight is uncommon |
| 5 | 8 — Context budget | Quick; pairs with drill 1 |
| 6 | 3 — Semantic cache | The scoping trap |
| 7 | 5 — Chunker | Easiest; good warm-up |
| 8 | 7 — SSE | Fiddly; needs a real server to feel right |

---

## What's NOT here

| Topic | Doc |
|---|---|
| Classic OOP machine coding (Splitwise, parking lot, LRU) | [system-design-prep.md](../system-design-prep.md) §B |
| DSA problems | [interview-qa/09](../interview-qa/09-coding-arrays-strings.md), [10](../interview-qa/10-coding-structures-dp.md) |
| Why RRF, pre-filtering, chunking work the way they do | [03-rag.md](03-rag.md) |
| Agent production concerns behind drill 1 | [05-agents.md](05-agents.md) |
| SSE, cancellation and buffering in depth | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) |
| Gateways, budgets and cost attribution in production | [08-llmops.md](08-llmops.md) |
| Designing these as systems rather than coding them | [11-ai-system-design.md](11-ai-system-design.md) |

---

← Back to [INDEX.md](INDEX.md)
