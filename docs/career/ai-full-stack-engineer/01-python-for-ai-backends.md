# 01: Python for AI Backends

> **JD lines covered:** "Strong Python programming skills" · "Mastery of Python … AsyncIO,
> Concurrency/Parallelism" · "efficient multi-threading/multiprocessing for AI workloads".
>
> Most of your shipped code is TypeScript. Interviewers for these roles will probe Python *idiom*
> and *concurrency*, and that's where TS-first engineers slip. For each concept this file gives
> the TS equivalent you already know.

---

## 🟢 Level 1: Basics (recall)

### 1.1 Core types and when to use each

| Type | Mutable | Ordered | Use for | TS analogue |
|---|---|---|---|---|
| `list` | yes | yes | sequences you append to | `Array` |
| `tuple` | **no** | yes | fixed records, dict keys, return multiple values | readonly tuple |
| `dict` | yes | insertion order (3.7+) | key → value lookup, O(1) | `Map` / object |
| `set` | yes | no | membership tests, dedupe, O(1) | `Set` |
| `frozenset` | no | no | a set used as a dict key | — |
| `str` / `bytes` | no | yes | text vs raw binary (files, network) | `string` / `Uint8Array` |

```python
chunks = ["a", "b", "a"]
unique = list(dict.fromkeys(chunks))       # dedupe *keeping order*: ['a', 'b']
seen = set(chunks)                          # dedupe, order lost
by_id = {c["id"]: c for c in docs}          # dict comprehension: index by key
pairs = list(zip(names, scores))            # [('a', 0.9), ...]
for i, chunk in enumerate(chunks, start=1): ...
```

**Truthiness:** `0, 0.0, "", [], {}, set(), None` are all falsy. `if not results:` is idiomatic.
Use `is None` rather than `== None`.

### 1.2 Functions

```python
def search(query: str, *, k: int = 5, filters: dict | None = None) -> list[dict]:
    ...
# `*` makes k and filters keyword-only → search("auth", k=10). Very common in clean APIs.

def log(*args, **kwargs): ...   # args = tuple of positionals, kwargs = dict of keywords
```

> ⚠️ **Mutable default trap**: `def f(items=[])` shares *one* list across every call. Use
> `items: list | None = None` and then `items = items or []`.

### 1.3 Comprehensions and generators

```python
squares = [x * x for x in range(10)]                 # builds the full list in memory
evens   = {x for x in nums if x % 2 == 0}            # set
lazy    = (x * x for x in range(10_000_000))         # generator: computed one at a time
```

A **generator function** uses `yield`. It pauses and resumes, so the memory cost is O(1) instead of
O(n). This is exactly how you stream a big file into chunks:

```python
def read_chunks(path: str, size: int = 1000):
    buf = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            buf.append(line)
            if sum(map(len, buf)) >= size:
                yield "".join(buf)
                buf = []
    if buf:
        yield "".join(buf)

for chunk in read_chunks("big.txt"):   # never holds the whole file
    embed(chunk)
```

TS analogue: `function*` generators. You rarely use them in TS, but they're everywhere in Python.

### 1.4 Classes, dataclasses, exceptions

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)            # auto __init__, __repr__, __eq__; frozen = immutable
class Chunk:
    doc_id: str
    text: str
    page: int
    meta: dict = field(default_factory=dict)   # never `= {}` (same trap as above)

class RetrievalError(Exception):
    """Base for retrieval failures, so callers can `except RetrievalError`."""

class EmptyIndexError(RetrievalError): ...
```

Build an **exception hierarchy** for your domain, the same way your pSEO generation
code throws `ChainExhaustedError` to trigger a job retry (see [projects/07-pseo-engine.md](projects/07-pseo-engine.md)).
Callers catch the base class and branch on the subclass.

```python
try:
    hits = retrieve(q)
except EmptyIndexError:
    hits = []
except RetrievalError as e:
    logger.exception("retrieval failed")   # logs the stack trace
    raise                                    # re-raise; don't swallow
finally:
    span.end()
```

### 1.5 Modules, packages, environments

- A **module** is a `.py` file. A **package** is a folder of modules (with `__init__.py`).
- `if __name__ == "__main__":` runs code only when the file is executed directly.
- **Virtual environment** = an isolated set of installed packages per project. Modern tooling is
  **`uv`** (very fast, recommended): `uv init`, `uv add fastapi`, `uv run pytest`. Older options
  are `python -m venv .venv` + `pip` and Poetry.
- `pyproject.toml` is the equivalent of `package.json`. A lock file (`uv.lock`) is the equivalent
  of `package-lock.json`.

### 1.6 Type hints

Python doesn't enforce types at runtime, but **mypy/pyright** check them, and **Pydantic and
FastAPI read them at runtime** to validate data. So in AI backends, types aren't optional.

```python
from typing import Literal, TypedDict, Protocol, Any
from collections.abc import Iterable, AsyncIterator

Role = Literal["user", "assistant", "tool"]

class Message(TypedDict):
    role: Role
    content: str

class Embedder(Protocol):                 # structural typing, same idea as a TS interface
    def embed(self, texts: list[str]) -> list[list[float]]: ...

def first(xs: Iterable[str]) -> str | None: ...
```

`Protocol` gives you duck typing that's still type-checked. It's how you swap a `FakeEmbedder`
in tests for a real one, the same pattern repo-intelligence uses in TS.

---

## 🟡 Level 2: Intermediate (the idioms AI code relies on)

### 2.1 Decorators: functions that wrap functions

A decorator takes a function and returns a new one with extra behaviour. Your
AI-observability-engine SDK's `@observe` is exactly this (see
[projects/01-ai-observability-engine.md](projects/01-ai-observability-engine.md)).

```python
import functools, time, logging
log = logging.getLogger(__name__)

def timed(fn):
    @functools.wraps(fn)                 # keep the original name/docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            log.info("%s took %.1f ms", fn.__name__, (time.perf_counter() - start) * 1000)
    return wrapper

@timed
def rerank(query, docs): ...
# identical to: rerank = timed(rerank)
```

A decorator **with arguments** is one level deeper: `retry(times=3)` returns a decorator.

```python
def retry(times: int = 3, on: tuple[type[Exception], ...] = (Exception,)):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            for attempt in range(1, times + 1):
                try:
                    return fn(*a, **kw)
                except on:
                    if attempt == times:
                        raise
                    time.sleep(2 ** attempt)        # exponential backoff
        return wrapper
    return deco

@retry(times=4, on=(TimeoutError,))
def call_llm(prompt): ...
```

In real code, use **`tenacity`** (`@retry(stop=stop_after_attempt(4), wait=wait_exponential())`)
instead of writing this yourself. Knowing how it works is what the interview tests.

### 2.2 Context managers: guaranteed setup/teardown

`with` guarantees cleanup even if an exception is thrown. Typical uses are DB sessions, files,
locks and trace spans.

```python
from contextlib import contextmanager

@contextmanager
def span(name: str):
    start = time.perf_counter()
    try:
        yield                        # the body of the `with` block runs here
    finally:
        record(name, time.perf_counter() - start)

with span("retrieve"):
    hits = retrieve(q)
```

The async version is `@asynccontextmanager` + `async with`. FastAPI's `lifespan` (startup/shutdown)
is one of these.

### 2.3 Iteration helpers you'll actually use

```python
from itertools import islice, batched   # batched: Python 3.12+
for batch in batched(texts, 64):        # embed in batches of 64
    vectors = embedder.embed(list(batch))

top = sorted(hits, key=lambda h: h.score, reverse=True)[:5]
import heapq; top = heapq.nlargest(5, hits, key=lambda h: h.score)   # O(n log k)

from collections import defaultdict, Counter
by_doc = defaultdict(list)
for h in hits: by_doc[h.doc_id].append(h)
Counter(tokens).most_common(10)
```

### 2.4 Logging, config and errors like a professional

```python
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger(__name__)
log.info("retrieved %d chunks for %s", len(hits), query_id)   # lazy formatting, no f-string
```

Configuration comes from **environment variables**, validated once at startup with
`pydantic-settings` (see [02](02-fastapi-async-pydantic-sqlalchemy.md)). Never read `os.environ`
scattered around the codebase.

### 2.5 Files, JSON, paths

```python
from pathlib import Path
import json
root = Path(__file__).parent
data = json.loads((root / "golden.json").read_text(encoding="utf-8"))
for pdf in (root / "docs").glob("**/*.pdf"): ...
```

---

## 🔴 Level 3: Advanced (AsyncIO and concurrency)

This is the section JD-2 explicitly names: *"high concurrency and efficient
multi-threading/multiprocessing for AI workloads"*.

### 3.1 The mental model: what kind of waiting is your code doing?

| Workload | Bottleneck | Tool | Example in an AI app |
|---|---|---|---|
| **I/O-bound** (waiting on network/disk) | Waiting, not computing | **`asyncio`** (best), or threads | LLM API calls, vector DB queries, HTTP to tools |
| **CPU-bound** (pure computation) | The CPU | **`multiprocessing`** / `ProcessPoolExecutor` | PDF parsing, local embedding, tokenizing 10k docs, BM25 index build |
| **Blocking library you can't change** | A sync SDK in async code | `asyncio.to_thread()` | A sync DB driver or old SDK |

### 3.2 The GIL in one paragraph

CPython has a **Global Interpreter Lock**: only one thread runs Python bytecode at a time.
So threads **don't** speed up CPU-bound Python. They do help I/O-bound work, because a thread
releases the GIL while it waits on the network. For CPU work you use **processes**, each with its
own interpreter and its own GIL. (Python 3.13+ has an experimental *free-threaded* build without
the GIL. Mention you know it exists, but don't rely on it.) NumPy and PyTorch release the GIL inside
their C code, which is why threaded numeric code can still scale.

### 3.3 AsyncIO: how it actually works

- An **event loop** runs on one thread. It keeps a list of tasks.
- `async def` defines a **coroutine**. Calling it *doesn't run it*. It returns a coroutine object.
- `await x` means "pause me until x is done, and let the loop run other tasks meanwhile".
- So 100 LLM calls that each wait 2 s on the network take about 2 s total, not 200 s, all on one thread.

It's the same model as JavaScript's event loop and `Promise`. `asyncio.gather` ≈ `Promise.all`.

```python
import asyncio, httpx

async def fetch(client: httpx.AsyncClient, url: str) -> int:
    r = await client.get(url, timeout=10)
    return r.status_code

async def main(urls: list[str]):
    async with httpx.AsyncClient() as client:          # ONE client = connection pooling
        results = await asyncio.gather(*(fetch(client, u) for u in urls),
                                       return_exceptions=True)  # one failure doesn't kill all
    return results

asyncio.run(main(urls))
```

### 3.4 Bounding concurrency: the semaphore (critical for LLM rate limits)

Firing 500 LLM requests at once means instant 429s. Use a `Semaphore` to cap how many run at the
same time.

```python
sem = asyncio.Semaphore(10)          # at most 10 in flight

async def summarize(doc: str) -> str:
    async with sem:
        resp = await llm.ainvoke(f"Summarize:\n{doc}")
        return resp.content

summaries = await asyncio.gather(*(summarize(d) for d in docs))
```

### 3.5 Timeouts, cancellation and TaskGroups (3.11+)

```python
async with asyncio.timeout(30):                 # cancel everything inside after 30 s
    answer = await agent.ainvoke(state)

async with asyncio.TaskGroup() as tg:           # structured concurrency
    t1 = tg.create_task(search_web(q))
    t2 = tg.create_task(search_vectors(q))
# if one task raises, the others are cancelled and the error propagates (ExceptionGroup)
web, vec = t1.result(), t2.result()
```

When a user closes the browser tab mid-stream, FastAPI cancels your coroutine, and
`asyncio.CancelledError` is raised at the current `await`. **Never swallow `CancelledError`.**
Clean up and re-raise.

### 3.6 The #1 async bug: blocking the event loop

```python
async def handler():
    time.sleep(2)              # ❌ freezes EVERY request on this worker for 2 s
    requests.get(url)          # ❌ sync HTTP: same problem
    heavy_pdf_parse(file)      # ❌ CPU work: same problem

async def handler():
    await asyncio.sleep(2)                          # ✅
    await client.get(url)                           # ✅ httpx.AsyncClient
    await asyncio.to_thread(sync_sdk_call, x)       # ✅ offload a blocking call to a thread
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(process_pool, heavy_pdf_parse, file)   # ✅ CPU → process pool
```

### 3.7 Producer/consumer with `asyncio.Queue` (ingestion pipelines)

```python
async def producer(q: asyncio.Queue, paths):
    for p in paths:
        await q.put(p)
    for _ in range(N_WORKERS):
        await q.put(None)                   # poison pill = "stop"

async def worker(q: asyncio.Queue):
    while (p := await q.get()) is not None:
        text = await asyncio.to_thread(parse, p)
        await index(text)
        q.task_done()

q = asyncio.Queue(maxsize=100)              # bounded queue = backpressure
await asyncio.gather(producer(q, paths), *(worker(q) for _ in range(N_WORKERS)))
```

### 3.8 Multiprocessing for CPU work

```python
from concurrent.futures import ProcessPoolExecutor

def parse_pdf(path: str) -> list[str]: ...   # must be a top-level function (it's pickled)

with ProcessPoolExecutor(max_workers=os.cpu_count()) as pool:
    for chunks in pool.map(parse_pdf, paths, chunksize=4):
        store(chunks)
```

Costs to know: process start-up time, and **arguments/results are pickled** (copied) between
processes, so don't send giant objects back and forth.

### 3.9 How a production FastAPI server uses all of this

```
uvicorn/gunicorn  → N worker *processes* (≈ CPU cores)  → parallelism across cores
   each worker    → 1 event loop                         → thousands of concurrent awaits
   CPU-heavy jobs → separate queue workers (Celery/arq/RQ) or a process pool → keep the API loop free
```

That's the answer to *"how do you get high concurrency in a Python AI backend?"*: async for I/O,
processes for CPU, a queue for long jobs, a semaphore for rate limits.

---

## 🔧 Integration recipe: a concurrent, rate-limited batch summarizer

The real pattern for "summarize 2,000 support tickets with an LLM" uses everything above.

```python
import asyncio, logging
from anthropic import AsyncAnthropic, RateLimitError, APIStatusError
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type

log = logging.getLogger(__name__)
client = AsyncAnthropic()                    # reads ANTHROPIC_API_KEY
sem = asyncio.Semaphore(8)

@retry(retry=retry_if_exception_type(RateLimitError),
       stop=stop_after_attempt(5), wait=wait_exponential_jitter(initial=1, max=30))
async def summarize_one(ticket: dict) -> dict:
    async with sem:
        msg = await client.messages.create(
            model="claude-haiku-5-5",         # cheap model for bulk work
            max_tokens=512,
            messages=[{"role": "user", "content": f"Summarize in 2 lines:\n{ticket['body']}"}],
        )
    text = next(b.text for b in msg.content if b.type == "text")
    return {"id": ticket["id"], "summary": text,
            "in_tok": msg.usage.input_tokens, "out_tok": msg.usage.output_tokens}

async def summarize_all(tickets: list[dict]) -> list[dict]:
    results = await asyncio.gather(*(summarize_one(t) for t in tickets), return_exceptions=True)
    ok = [r for r in results if not isinstance(r, Exception)]
    failed = [t["id"] for t, r in zip(tickets, results) if isinstance(r, Exception)]
    log.info("done=%d failed=%d", len(ok), len(failed))
    return ok
```

What to say about it: the semaphore caps concurrency, tenacity retries only on 429 with jittered
backoff, `return_exceptions=True` keeps a partial failure from losing the batch, and usage is
recorded per item for cost. (For non-urgent bulk jobs, the provider's **Batch API** is about 50%
cheaper.)

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| Async Python service | AI-observability-engine (FastAPI) | [projects/01](projects/01-ai-observability-engine.md) |
| Decorator-based SDK (`@observe`) | AI-observability-engine SDK | [projects/01](projects/01-ai-observability-engine.md) |
| Agent loop in Python | trading-agent | [projects/02](projects/02-trading-agent.md) |
| Typed error → job retry | pSEO `ChainExhaustedError` (TS) | [projects/07](projects/07-pseo-engine.md) |
| Bounded concurrency / queues | pSEO pg-boss workers, AgentSystem BullMQ (TS) | [projects/04](projects/04-agent-system.md), [projects/07](projects/07-pseo-engine.md) |

---

## ✅ Self-check (answer out loud)

1. Why is `def f(x=[])` a bug? Fix it.
2. Write a generator that yields overlapping windows of 500 chars with 50 overlap.
3. Write `@timed` from memory. Why `functools.wraps`?
4. What does calling an `async def` function return without `await`?
5. You have 1,000 LLM calls and a limit of 50 RPM. Design the code.
6. Your FastAPI endpoint got slow for *all* users when one user uploads a PDF. Why? Two fixes.
7. Threads vs processes vs asyncio for: (a) 500 HTTP calls (b) parsing 500 PDFs (c) a sync DB driver inside an async app.
8. What happens to your coroutine when the client disconnects mid-stream?
9. `gather` vs `TaskGroup`: what's the difference on failure?
10. Why must a function sent to a `ProcessPoolExecutor` be top-level?

## ⚠️ Traps

- Saying "Python threads run in parallel". They don't for Python bytecode (the GIL).
- Creating a new `httpx.AsyncClient()` per request, which loses connection pooling.
- `asyncio.gather` with no concurrency limit against a rate-limited API.
- Catching bare `except:`. It catches `BaseException`, which includes `KeyboardInterrupt` and `asyncio.CancelledError`, so it breaks Ctrl-C and cancellation. Use `except Exception:`.
- Using `print` instead of `logging` in a service.
