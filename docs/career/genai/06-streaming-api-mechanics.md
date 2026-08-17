# 06 — Streaming & API mechanics

> The plumbing that makes an LLM feature feel fast. Short file, high hit rate — "why does it stream
> locally and buffer in production" is asked constantly and answered badly.
>
> **You have unusually good adjacent depth here** (WebRTC, Socket.io, Nginx) and one honest gap:
> none of your LLM systems stream tokens. Glacier Dev streams *progress events*, pSEO polls.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### Why stream at all

**TTFT is the metric users feel.** A 12-second response that starts in 300 ms feels fast; a
3-second response that starts in 3 seconds feels broken. Streaming doesn't reduce total time — it
changes the perceived latency from "total" to "first token".

Reading speed is roughly 5–8 tokens/sec, so anything above ~15 tokens/sec reads as instant.
Optimising tokens/sec beyond that is wasted effort; optimising TTFT never is.

### 🔥 SSE vs WebSocket vs polling

| | SSE | WebSocket | Polling |
|---|---|---|---|
| Direction | Server → client | Bidirectional | Client-pulls |
| Protocol | Plain HTTP | Upgrade handshake | Plain HTTP |
| Reconnect | **Automatic**, with `Last-Event-ID` | Manual | N/A |
| Proxies/CDNs | Usually fine (with buffering off) | Needs upgrade support | Always fine |
| Auth | Cookies fine; **custom headers need `fetch`**, not `EventSource` | Query param or subprotocol | Normal |
| Overhead | Low | Lowest per message | Highest |

**Default to SSE for LLM responses.** Token streaming is inherently unidirectional, SSE is plain
HTTP so it traverses infrastructure that mangles WebSocket upgrades, and it reconnects for free.

**Choose WebSocket when** the client sends continuously mid-stream (voice), you need very low
latency both ways, or you're multiplexing many concurrent streams over one connection.

**The gotchas:**
- **HTTP/1.1 caps ~6 connections per origin per browser.** Several open SSE streams and the tab
  stalls. HTTP/2 multiplexes and removes this.
- `EventSource` cannot set custom headers, so bearer-token auth needs the `fetch` + `ReadableStream`
  approach instead.
- Serverless platforms often cap response duration — a long generation can be cut mid-stream.

### The SSE wire format

```
event: token
data: {"text":"Hello"}

: this is a comment — used as a heartbeat

event: done
data: {"tokens":142,"cost_cents":3}

```

Fields: `event`, `data`, `id` (echoed back as `Last-Event-ID` on reconnect), `retry`. Each frame
ends with a **blank line**; a line starting with `:` is a comment.

**Always emit a terminal event.** Without an explicit `done`, the client can't distinguish
completion from a dropped connection. Put usage and cost on it — it's the natural place.

### 🔥 Erroring after you've sent a 200

**Once headers are sent, you cannot return a 500.** This is the detail that separates people who
have shipped streaming from people who have read about it.

So: emit an `error` **event** and let the client handle it. Which means the client must handle
mid-stream errors, and partial output already rendered needs a decision — keep it marked
incomplete, or discard it.

**A useful trick:** buffer the first chunk before committing to the stream. If the upstream call
fails immediately — auth error, rate limit, bad request — you can still return a real HTTP status.
You trade a few ms of TTFT for proper error semantics on the most common failure.

### Streaming structured output

**You cannot `JSON.parse` a partial object.** Options:

1. **Don't stream JSON.** Stream prose, return structure separately.
2. **Incremental/partial JSON parser** — completes the open structure so you can render fields as
   they arrive. This is what "streamed object" APIs do under the hood.
3. **Stream at a delimiter** — one complete JSON object per line (NDJSON), parsed per line.

**Streaming tool calls** arrive as argument deltas across chunks: you accumulate the string per
`tool_call_id` and can only execute once complete. Parallel calls interleave, so you accumulate
into a map keyed by id, not a single buffer.

### 🔥 Cancellation

**If you don't propagate cancellation, you keep generating — and paying for — tokens nobody will
read.**

The chain: browser aborts (tab closed, `AbortController`) → server sees `req.on('close')` → server
aborts the provider request → provider stops generating.

Break any link and the cost continues. In an agent loop, cancellation must also stop the *next*
step, not just the current call — so the loop checks the signal each iteration.

**Bill what was actually generated**, not what was requested — you have the partial token count.

### Backpressure

`res.write()` returns `false` when the socket buffer is full; ignoring it means unbounded memory
growth with a slow consumer. Await `drain`. With many concurrent streams this matters more than it
looks.

For very high token rates, **coalesce chunks** — flushing every token is a syscall per token.
Batching a few tokens or every ~50 ms cuts overhead with no perceptible latency cost.

### 🔥 The "streams locally, buffers in production" bug

Almost always a proxy buffering the response. The checklist:

| Layer | Fix |
|---|---|
| **Nginx** | `proxy_buffering off;` and `X-Accel-Buffering: no` |
| **Compression** | gzip buffers to compress — send `Cache-Control: no-transform`, or disable for SSE |
| **CDN / ALB** | Some buffer by default; check and disable |
| **Serverless** | Response duration caps and buffered response modes |
| **Framework** | Some middleware buffers the response body |
| **Client** | `EventSource` handles framing; raw `fetch` needs the reader loop written correctly |

**Say `proxy_buffering off` unprompted** — it's the one-line answer and it demonstrates you've hit
it.

### Reconnection and resumability

`EventSource` reconnects automatically and sends `Last-Event-ID`. To *resume* rather than restart:
persist generated output keyed by a generation id, and on reconnect replay from the last id.
Without that, a reconnect either restarts generation (paying twice) or drops the response.

**Idempotency:** a generation id supplied by the client means a retried request returns the same
generation instead of starting a new one.

### Timeouts, in phases

| Timeout | Catches |
|---|---|
| Connect | Provider unreachable |
| **TTFT** | Accepted the request, produced nothing — the real hang |
| Inter-token | Stream stalled mid-generation |
| Total | Runaway generation |

One total timeout can't distinguish a legitimately long generation from a dead provider. See
[08-llmops.md](08-llmops.md).

> 🔗 *Yours:* your systems have a single 60s total timeout (`AbortSignal.timeout(60_000)` in pSEO's
> router). Correct for non-streaming; the phase split is what you'd add for streaming.

---

## Part 2 — Drill

**1. Why stream LLM responses?**
> Perceived latency. Streaming doesn't make the total faster — it changes what the user waits for
> from the whole response to the first token. A twelve-second response starting in 300 ms feels
> fast; a three-second response starting in three seconds feels broken. And since people read at
> five to eight tokens a second, anything past about fifteen reads as instant — so TTFT is the
> metric worth optimising, not throughput.

**2. 🔥 SSE or WebSocket for token streaming?**
> SSE, by default. Token streaming is one-directional, SSE is plain HTTP so it passes through
> proxies and CDNs that mangle WebSocket upgrades, and it reconnects automatically with
> `Last-Event-ID`. I'd choose WebSocket when the client is also sending continuously mid-stream —
> a voice agent — or when I'm multiplexing many streams over one connection. Two SSE gotchas worth
> knowing: HTTP/1.1 caps around six connections per origin per browser, so several open streams
> stall the tab unless you're on HTTP/2; and `EventSource` can't set custom headers, so bearer-token
> auth needs the `fetch` and `ReadableStream` approach instead.

**3. What's on the wire?**
> Frames of `event:` and `data:` lines terminated by a blank line, optionally with an `id` that
> comes back as `Last-Event-ID` on reconnect. Lines starting with a colon are comments, which is
> what heartbeats use. And I always emit an explicit terminal event — without one the client can't
> tell completion from a dropped connection — with the token usage and cost on it, since that's the
> natural place for them.

**4. 🔥 Your upstream fails after you've streamed 200 tokens. What do you return?**
> Not a status code — the headers went out with the 200 two hundred tokens ago. It has to be an
> `error` **event** in the stream, which means the client has to handle mid-stream errors, and I
> have to decide what happens to the partial output already rendered — mark it incomplete rather
> than silently leaving it as if it were finished.
>
> ↳ **If pushed:** "One trick that helps: buffer the first chunk before committing to the stream.
> If the upstream fails immediately — auth, rate limit, bad request, which is most failures — I can
> still return a real HTTP status. A few milliseconds of TTFT for proper error semantics."

**5. How do you stream structured output?**
> You can't parse a partial JSON object, so there are three options. Don't stream the JSON —
> stream prose and return structure separately, which is usually right. Use an incremental parser
> that completes the open structure so fields render as they arrive, which is what streamed-object
> APIs do underneath. Or stream at a delimiter — NDJSON, one complete object per line — which is
> the simplest when the output is a list.

**6. How do streaming tool calls arrive?**
> As argument deltas across chunks, so you accumulate the string per `tool_call_id` and can only
> execute once it's complete. The trap is parallel calls: they interleave, so you accumulate into a
> map keyed by id rather than one buffer. And you still have to return a result for every call
> before the next model turn.

**7. 🔥 The user closes the tab mid-generation. What happens?**
> If I've done nothing, generation continues and I pay for every token nobody will read. The chain
> has to be complete: the browser aborts, the server sees `req.on('close')`, and the server aborts
> the in-flight provider request — usually by passing an `AbortSignal` through. Break any link and
> the cost continues. In an agent loop the signal also has to stop the *next* step, not just the
> current call. And I'd bill what was actually generated, not what was requested, since I have the
> partial count.

**8. What is backpressure here?**
> `res.write()` returns false when the socket buffer is full. If I ignore that and keep writing,
> memory grows unbounded against a slow consumer — and with many concurrent streams that's how you
> take the process down. So I await `drain` before continuing. For very high token rates I'd also
> coalesce chunks, batching a few tokens or every fifty milliseconds, because flushing per token is
> a syscall per token for no perceptible gain.

**9. 🔥 It streams on localhost and arrives all at once in production.**
> A proxy is buffering. The checklist in order: Nginx needs `proxy_buffering off` or the
> `X-Accel-Buffering: no` header; gzip buffers in order to compress, so `Cache-Control:
> no-transform` or disable compression for SSE; the CDN or load balancer may buffer by default;
> serverless platforms have response-duration caps and buffered modes; and some framework
> middleware buffers the body. Nine times out of ten it's Nginx.

**10. How do you resume a stream after a disconnect?**
> `EventSource` reconnects on its own and sends `Last-Event-ID`, but that only helps if the server
> can replay — which means persisting generated output keyed by a generation id and replaying from
> the last acknowledged id. Without that, a reconnect either restarts generation and pays twice or
> drops the response. Related: if the client supplies the generation id, a retried request returns
> the same generation rather than starting a new one.

**11. Why heartbeats?**
> Because intermediaries close idle connections. If the model is thinking for twenty seconds before
> the first token, nothing is on the wire and a proxy may drop it. A comment frame every few
> seconds keeps it open and costs nothing.

**12. What timeout would you set on a streaming call?**
> Not one. A connect timeout, a TTFT timeout — maybe ten seconds, and that's the one that catches
> the real hang where the provider accepted the request and produced nothing — an inter-token
> timeout for a stalled stream, and a total timeout for runaway generation. A single sixty-second
> total can't distinguish a legitimately long generation from a dead provider.
>
> 🔗 *Yours (honest):* "Mine use a single 60-second total timeout, which is right for the
> non-streaming calls they make. The phase split is what I'd add."

**13. How do you know streaming is healthy in production?**
> TTFT p50 and p95 as the headline, tokens per second after that, the rate of streams that end
> without a terminal event — which is your dropped-connection signal — and cancellation rate,
> because a high one usually means responses are too slow or wrong. Total latency is the wrong
> headline for a streaming endpoint.

**14. Have you built token streaming?**
> Not for LLM output, and I'd say so directly. What I've built is adjacent and relevant: real-time
> media over WebRTC and Mediasoup in a production system, Socket.io fan-out with sequence-number
> resync and backpressure in a market scanner, and SSE for agent *progress* events — with
> `X-Accel-Buffering: no` set, because I'd hit the buffering problem. My generation endpoints poll
> rather than stream, which was the right call for a background page-generation job and would be
> the wrong call for a chat interface.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| TTFT | Time to first token — the metric users feel |
| Tokens/sec | Perceived speed after the first token |
| SSE | Server→client stream over plain HTTP |
| `EventSource` | Browser SSE client — auto-reconnect, **no custom headers** |
| `Last-Event-ID` | Sent on reconnect so the server can resume |
| Comment frame | A line starting with `:` — the heartbeat |
| Terminal event | Explicit `done` — otherwise completion looks like a drop |
| Error-as-event | The only way to fail after headers are sent |
| First-chunk buffering | Trade a little TTFT for real HTTP error codes |
| Partial JSON parser | Renders fields from an incomplete object |
| NDJSON | One complete object per line — parseable as it streams |
| Tool-call deltas | Accumulate per `tool_call_id`, not into one buffer |
| `AbortController` | Client-side cancellation origin |
| `req.on('close')` | Where the server learns the client left |
| Cancellation propagation | Stop paying for tokens nobody reads |
| Backpressure | `write()` returns false → await `drain` |
| Chunk coalescing | Batch flushes so you're not syscalling per token |
| `proxy_buffering off` | The Nginx fix |
| `X-Accel-Buffering: no` | The header version |
| `no-transform` | Stops gzip buffering your stream |
| HTTP/1.1 connection cap | ~6 per origin — several SSE streams stall the tab |
| TTFT timeout | Catches "accepted, produced nothing" |
| Inter-token timeout | Catches a stalled stream |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| SSE + buffering | Glacier Dev | "A real `ReadableStream` with `text/event-stream` and `X-Accel-Buffering: no`, emitting agent progress events and per-file lines." |
| Streaming that isn't token streaming | Glacier Dev | "`streamText` exists in that codebase and nothing calls it — the SSE is progress events, not tokens. I'd rather say that than imply otherwise." |
| Polling instead of streaming | pSEO | "Background page generation polls a run endpoint with `no-store`. Right for a batch job, wrong for chat." |
| Real-time fan-out | SmartTrader | "WebSocket fan-out with throttling, sequence-number resync and backpressure." |
| Live updates without streaming tokens | AgentSystem | "Redis pub/sub into Socket.io, with `console.log` monkey-patched per job to tee agent logs to the UI." |
| Media-grade real-time | LACS, StreamVerse | "Mediasoup WebRTC in production, including jitter buffers and P2P→SFU escalation." |
| Nginx in anger | LACS infra | "`proxy_buffering` and WebSocket upgrade config is something I've debugged, not read about." |
| Cancellation instinct | pSEO | "512 KB response cap with stream cancellation on the URL fetcher — same idea, different layer." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **LLM token streaming** | "I haven't shipped it. My generation is batch and polled, which was right for the workload. I've built SSE for progress events and WebRTC/Socket.io real-time, so the mechanics transfer — but I'd rather be precise about what I've actually done." |
| **Partial JSON parsing** | "Understood, not shipped. I've done the batch version — parse, validate, repair, retry." |
| **Streaming tool calls** | "My tool calling is non-streaming. I know the accumulation-per-id shape and the parallel-call interleaving trap." |
| **Resumable streams** | "Never needed it. The design is clear — persist by generation id and replay from `Last-Event-ID`." |
| **Phase-specific timeouts** | "Single total timeout today, which is right for non-streaming. The TTFT split is what streaming needs." |

---

## What's NOT here

| Topic | Doc |
|---|---|
| TTFT/prefill/decode mechanics | [01-foundations.md](01-foundations.md) |
| Structured output and JSON repair (non-streaming) | [02-prompting-structured-output.md](02-prompting-structured-output.md) |
| Latency SLOs, timeouts and retries in production | [08-llmops.md](08-llmops.md) |
| WebSocket vs long-polling generally, Nginx config | [interview-qa/06-devops-infra.md](../interview-qa/06-devops-infra.md) |
| WebRTC, SFU, jitter buffers | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |
| Realtime voice latency budget | [09-multimodal-voice.md](09-multimodal-voice.md) |
| Implementing an SSE endpoint under a timer | [12-ai-machine-coding.md](12-ai-machine-coding.md) drill 7 |

---

← Back to [INDEX.md](INDEX.md)
