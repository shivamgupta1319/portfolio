# Interview Q&A — Caylent | BOT Consulting, Software Engineer

> Technical round 1 of: **Technical interviews → take-home / case study → assessment review or
> whiteboard with the GCC partners → in-person cultural round.** The recruiter's read, and the JD's,
> is that the role is **Python + AWS first**, with GenAI on Bedrock as the thing that makes Caylent
> Caylent. The weighting here follows that: §1–§8 are Python and AWS, §9 is GenAI, and everything
> after that is design, projects and people.
>
> Same conventions as [`../interview-qa/INDEX.md`](../interview-qa/INDEX.md):
> **↳ If pushed** is the follow-up that's coming · 🔗 *Yours* ties the concept to your own work ·
> 🔥 marks the ones you'll get asked.
>
> **Say it out loud before you read the answer.** Mark ✅ / ⚠️ / ❌ in the tracker at the bottom,
> and only re-drill ⚠️ and ❌.
>
> ⚠️ **Read the AWS claim boundary in [`README.md`](README.md#the-aws-claim-boundary--read-this-first)
> before §5.** Your general résumé lists no AWS at all. Every 🔗 *Yours* line in the AWS sections
> is written so it stays true regardless.

**Contents:** [1 Python core](#1--python-core) ·
[2 Python in production](#2--python-in-production) ·
[3 Python on AWS: boto3 & Lambda](#3--python-on-aws-boto3-and-lambda) ·
[4 Python coding drills](#4--python-coding-drills-tested) ·
[5 AWS core services](#5--aws-core-services) ·
[6 Serverless architecture](#6--serverless-architecture-and-orchestration) ·
[7 CI/CD, IaC & observability](#7--cicd-iac-and-observability) ·
[8 Data engineering](#8--data-engineering-etl-feature-stores-vector-dbs) ·
[9 GenAI on AWS](#9--genai-on-aws-bedrock-and-claude) ·
[10 Design prompts](#10--design-prompts-theyre-likely-to-give) ·
[11 Project grilling](#11--project-grilling) ·
[12 Behavioural & positioning](#12--behavioural-and-positioning) ·
[13 Honest gaps](#13--honest-gaps) ·
[14 Questions to ask](#14--questions-to-ask-them)

---

## 1 · Python core

> The deeper versions of the GIL, asyncio, decorator and generator answers are in
> [`../interview-qa/04-python-fastapi.md`](../interview-qa/04-python-fastapi.md). These are the
> short spoken versions, plus the questions that file doesn't cover.

**Q. 🔥 What is the GIL, and when does it actually matter?**

> The Global Interpreter Lock means only one thread executes Python bytecode at a time in a
> process. It matters for **CPU-bound** work: two threads crunching numbers won't use two cores.
> It mostly doesn't matter for **I/O-bound** work, because a thread waiting on a socket, a file or
> an AWS API call releases the GIL, so threads overlap their waiting.
>
> So: I/O-bound work gets threads or asyncio; CPU-bound work gets `multiprocessing` or a
> `ProcessPoolExecutor`, or it gets pushed into a C extension like NumPy that releases the GIL
> itself. Python 3.13 added an optional free-threaded build without the GIL, but it's opt-in and
> the ecosystem is still catching up, so I wouldn't design around it yet.

↳ **If pushed — boto3 calls in parallel?** Threads. boto3 is synchronous and I/O-bound, so a
`ThreadPoolExecutor` fanning out, say, 50 S3 `head_object` calls gives a near-linear speedup.
Create one client and share it across the threads, because clients are thread-safe. Don't share
a `Session` or a `resource` object across threads.

---

**Q. 🔥 `asyncio` vs threads vs multiprocessing — pick one for each of these: 1,000 HTTP calls, resizing 10,000 images, a web API.**

> **1,000 HTTP calls:** asyncio with an async client like `httpx` or `aiohttp`, bounded by a
> `Semaphore` so I don't open 1,000 sockets at once. Threads work too if the library is sync.
> **10,000 images:** multiprocessing. It's CPU-bound, so I'd use a `ProcessPoolExecutor` with
> roughly one worker per core. On AWS, I'd more likely fan it out to Lambda or a Batch job, so each
> image is its own unit of work.
> **Web API:** asyncio via FastAPI, as long as everything on the request path is async. One
> blocking call inside an `async def` stalls the whole event loop for every request.

```python
import asyncio, httpx

async def fetch_all(urls: list[str], limit: int = 20) -> list[int]:
    sem = asyncio.Semaphore(limit)
    async with httpx.AsyncClient(timeout=10) as client:
        async def one(url: str) -> int:
            async with sem:
                r = await client.get(url)
                return r.status_code
        return await asyncio.gather(*(one(u) for u in urls))
```

↳ **If pushed — `gather` vs `TaskGroup`?** `asyncio.TaskGroup` (3.11+) is structured
concurrency. If one task fails, the others get cancelled and you get an `ExceptionGroup`.
Plain `gather` without `return_exceptions=True` raises the first error but leaves the other tasks
running. For new code, I'd use `TaskGroup`.

---

**Q. 🔥 What's wrong with this?**

```python
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags
```

> The default list is created **once**, when the function is defined, not on each call. So every
> call that doesn't pass `tags` shares and mutates the same list: `add_tag("a")` then
> `add_tag("b")` returns `["a", "b"]`. The fix is a `None` sentinel:

```python
def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    tags = [] if tags is None else tags
    tags.append(tag)
    return tags
```

↳ **If pushed — the Lambda version of this bug:** module-level state in a Lambda also survives
between invocations, because the execution environment is reused. That's the *feature* you use
to cache a boto3 client, and the *bug* you get when you cache per-request data like a user id at
module scope.

---

**Q. Explain closures and the LEGB rule. What does `nonlocal` do?**

> Name lookup goes **Local → Enclosing → Global → Built-in**. A closure is an inner function that
> keeps a reference to variables from the enclosing scope after that scope has returned. You can
> *read* an enclosing variable freely. *Assigning* to it makes it local unless you declare it
> `nonlocal`, or `global` for module scope.

```python
def counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc
```

↳ **If pushed — the late-binding trap:** `[lambda: i for i in range(3)]` gives three functions
that all return 2, because they capture the *variable* `i`, not its value at that moment. Bind
it with a default argument (`lambda i=i: i`) to capture the value.

---

**Q. 🔥 Write a decorator that logs how long a function takes. Why `functools.wraps`?**

```python
import functools, logging, time

log = logging.getLogger(__name__)

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            log.info("%s took %.1f ms", fn.__qualname__, (time.perf_counter() - start) * 1000)
    return wrapper
```

> `wraps` copies the wrapped function's `__name__`, `__doc__`, `__module__` and `__wrapped__` onto
> the wrapper. Without it, every decorated function shows up as `wrapper` in logs, tracebacks and
> tools like FastAPI that inspect signatures. The `try/finally` means the timing is logged even
> when the call raises.

↳ **If pushed — a decorator that takes arguments?** That's one more level of nesting: a function
that takes the arguments and returns the decorator. The `retry` drill in §4 (#10) is exactly that.

🔗 *Yours:* if you've written a tracing `@observe`-style decorator in your own work, this is the
moment to say so. Only cite a project that's on the résumé they have.

---

**Q. Generators — why use one, and what does `yield from` do?**

> A generator produces values lazily, one at a time, so memory stays constant however large the
> sequence is. That's the right shape for streaming a 10 GB S3 object line by line, or paging
> through an API. `yield from` delegates to a sub-iterator, which is how you flatten pages into one
> stream. Drills #11 (`batched`) and #14 (`paginate`) in §4 are both generators.

↳ **If pushed — the catch?** A generator can only be consumed once, and nothing runs until
someone iterates it. So an exception inside it surfaces at consumption time, not at the call site.

---

**Q. Context managers — write one.**

```python
from contextlib import contextmanager

@contextmanager
def temp_env(key: str, value: str):
    import os
    old = os.environ.get(key)
    os.environ[key] = value
    try:
        yield
    finally:
        if old is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = old
```

> A context manager guarantees setup and teardown around a block, whatever happens inside it:
> file handles, locks, DB transactions, temporary credentials. The class form uses `__enter__` and
> `__exit__`. `__exit__` receives the exception and can suppress it by returning `True`, which
> you almost never want.

---

**Q. `list` vs `tuple` vs `set` vs `dict` vs `deque` — and the costs?**

| Type | Use for | Cost to know |
|---|---|---|
| `list` | ordered, mutable sequence | `x in list` is O(n); `pop(0)` is O(n) |
| `tuple` | fixed records, dict keys | immutable, hashable if its contents are |
| `set` | membership, dedup | `in` is O(1) average |
| `dict` | lookup by key | insertion-ordered since 3.7; O(1) average |
| `deque` | queues, BFS, sliding windows | O(1) at both ends |

> The classic bug is a `list` used as a queue with `pop(0)`, or `if x in big_list` inside a
> loop. Both are quadratic, and both are fixed by picking the right container.

---

**Q. `is` vs `==`? Shallow vs deep copy?**

> `==` compares values. `is` compares identity, meaning the same object. Use `is` only for
> singletons: `None`, `True`, `False`. `copy.copy` duplicates the outer container but shares the
> nested objects. `copy.deepcopy` recursively duplicates everything. The bug is copying a nested
> config dict shallowly and then mutating a nested value in the "copy".

---

**Q. Dataclass vs Pydantic vs `TypedDict`?**

> **Dataclass:** internal data with no validation. It's fast, and `frozen=True` plus `slots=True`
> make it immutable and lean. **Pydantic:** data crossing a trust boundary, like API bodies, event
> payloads or LLM JSON output. It validates and coerces, and gives good errors. **`TypedDict`:**
> typing plain dicts you don't own, like a boto3 response or a Lambda event, at zero runtime
> cost.
>
> My rule: validate at the edge with Pydantic, then pass typed dataclasses inside.

---

**Q. Are type hints enforced? How do you use them?**

> Not at runtime. They're for tools. I run `mypy` (or `pyright`) in CI in strict mode, so a
> function returning `str | None` forces the caller to handle `None`. At runtime, Pydantic is the
> thing that actually enforces types, and only at the boundaries where I put it.

---

**Q. EAFP vs LBYL?**

> "Easier to Ask Forgiveness than Permission": try the operation and catch the specific
> exception. "Look Before You Leap": check first. Python idiom favours EAFP because the check and
> the action can race. The file can vanish between `os.path.exists` and `open`, and the S3 object
> can be deleted between `head_object` and `get_object`. Just do the operation and handle the
> failure.

---

**Q. How do you handle exceptions well?**

> Catch the narrowest exception you can actually handle, and let everything else propagate.
> Never use bare `except:`, because it swallows `KeyboardInterrupt` and `SystemExit`. Never
> `except Exception: pass`. When wrapping, chain with `raise AppError(...) from e` so the original
> traceback survives. And never return a plausible-looking default from a `catch` in a data path.

🔗 *Yours:* that last line is your zero-vector bug, Story 14 in
[`../genai/15-positioning-stories.md`](../genai/15-positioning-stories.md). An embedding failure
returned a zero vector, which poisoned the memory store silently. It's a great answer to "tell me
about a bug".

---

**Q. What's new in modern Python that you actually use?**

> f-strings; the walrus operator (`while chunk := read()`); `match` statements (3.10) for parsing
> event shapes; `X | None` union syntax (3.10); `TaskGroup` and exception groups (3.11);
> `tomllib` (3.11); and `itertools.batched` (3.12). Drill #11 re-implements that last one, because
> interviewers like asking for it.

---

## 2 · Python in production

**Q. 🔥 How do you structure and package a Python service?**

> A `src/` layout with the package underneath, plus a `pyproject.toml` as the single source of
> dependencies and tool config. I pin dependencies with a lock file (`uv`, Poetry or pip-tools) so
> CI and production install the exact same versions. Tests live in `tests/`. Config comes from
> environment variables validated into a settings object at startup, so a missing variable fails
> fast on boot, not at 3 a.m. on the first request that needs it. The same image or artifact
> gets promoted through environments; only config changes.

---

**Q. 🔥 How do you test Python code that calls AWS?**

> Three layers. **Unit tests** with the AWS boundary faked: `moto` gives an in-memory fake of S3,
> DynamoDB, SQS and so on, so my code runs real boto3 calls against it. For single calls I can use
> botocore's `Stubber`, which asserts the exact request. **Integration tests** against a real,
> disposable AWS dev account or stack in CI, because moto can't tell you your IAM policy is wrong.
> **Contract-level checks** on the event shapes: I keep a sample S3, SQS or API Gateway event as a
> fixture and validate the handler against it.

```python
import boto3, pytest
from moto import mock_aws

@pytest.fixture
def bucket():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-bucket")
        yield s3

def test_upload_writes_object(bucket):
    save_report(bucket, "test-bucket", "r1", b"hello")   # code under test
    body = bucket.get_object(Bucket="test-bucket", Key="reports/r1.json")["Body"].read()
    assert body == b"hello"
```

↳ **If pushed — pytest features you rely on:** fixtures for setup and teardown (with scopes),
`@pytest.mark.parametrize` for table-driven cases, `monkeypatch` for environment variables,
`tmp_path` for files, and `pytest-cov` in CI with a floor on changed lines rather than a vanity
total.

---

**Q. How do you do logging properly?**

> Use the `logging` module, never `print`, with one logger per module (`getLogger(__name__)`). In
> the cloud, log **structured JSON** so CloudWatch Logs Insights can filter on fields. Put a
> correlation or request id on every line so you can follow one request across services. Use
> lazy formatting (`log.info("x=%s", x)`), and never log secrets or full PII payloads. On Lambda,
> Powertools' `Logger` does the JSON and injects the request id for you.

---

**Q. A Python service is slow. How do you find out why?**

> Measure before touching anything. `cProfile` or `py-spy` (which attaches to a running process
> without a restart) shows where the time actually goes. In my experience, it's rarely the
> Python. It's an N+1 query, a missing index, a synchronous call in a loop, or a client
> recreated per request. For memory, I'd use `tracemalloc`. On AWS, I'd look at X-Ray traces first,
> because they tell you which *downstream* call is slow.

---

**Q. How would you build a CLI tool or an automation script the team can reuse?**

> That's this role's "assets and automations" line. Use `argparse`, or `typer` for richer CLIs,
> with subcommands; config from environment variables and flags; a `--dry-run` that prints what it
> *would* change; idempotent operations so a re-run is safe; a clear exit code for CI; and
> packaging via `pyproject.toml` so the tool installs with `pipx install`. The dry-run and
> idempotency parts matter most, because the next person to run it against a client account
> won't have read the code.

🔗 *Yours:* your phase-gated Claude Code workflow (`/create-feature` → `/review-docs` →
`/execute-phase` → `/verify-feature`) is itself a reusable delivery asset. See §12.

---

## 3 · Python on AWS: boto3 and Lambda

**Q. 🔥 Write a Python Lambda handler that processes S3 upload events. What goes outside the handler?**

```python
import json, logging, os, urllib.parse
import boto3

log = logging.getLogger()
log.setLevel(logging.INFO)

# Runs once per execution environment (cold start), then reused by warm invocations.
s3 = boto3.client("s3")
TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])

def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])  # keys arrive URL-encoded
        size = record["s3"]["object"].get("size", 0)
        TABLE.put_item(Item={"pk": f"FILE#{key}", "bucket": bucket, "size": size})
        log.info(json.dumps({"msg": "indexed", "key": key, "request_id": context.aws_request_id}))
    return {"processed": len(event["Records"])}
```

> **Outside the handler** go client creation, config loading and anything expensive that's safe
> to reuse. It runs once per cold start, and warm invocations reuse it. **Inside the handler**
> goes only per-request work. Two classic gotchas are in that snippet. S3 event keys are
> URL-encoded, so a file with a space in its name breaks without `unquote_plus`. And one event can
> contain multiple records.

↳ **If pushed — what if the same event arrives twice?** It can. S3 notifications and async
invocations are at-least-once. `put_item` keyed on the object is naturally idempotent here. If
the side effect were "send an email", I'd guard it with a conditional write on an idempotency key
first (§6).

---

**Q. 🔥 boto3 `client` vs `resource`? Sessions? Credentials?**

> `client` is the low-level, one-to-one mapping of the service API. It covers every operation,
> and it's what I default to. `resource` is the older object-oriented layer. AWS has said it won't
> get new features, so I only use it where it's genuinely nicer, like DynamoDB's `Table`. A
> `Session` holds credentials and region, and clients come from it.
>
> Credentials resolve through a chain: explicit arguments, environment variables, the shared
> config and credentials files or SSO, then the container or instance role. In AWS, code should
> **never** carry keys. A Lambda uses its execution role, EC2 its instance profile, and GitHub
> Actions assumes a role via OIDC.

---

**Q. How do you handle pagination, retries and throttling with boto3?**

> **Pagination:** never assume one call returns everything. `list_objects_v2` returns at most
> 1,000 keys. Use a paginator:

```python
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="my-bucket", Prefix="reports/"):
    for obj in page.get("Contents", []):
        ...
```

> **Retries:** configure them explicitly rather than trusting the default, e.g.
> `Config(retries={"max_attempts": 10, "mode": "adaptive"})`. Standard mode retries throttling
> and transient errors with exponential backoff. Adaptive adds client-side rate limiting.
> **Errors:** catch `botocore.exceptions.ClientError` and branch on
> `e.response["Error"]["Code"]` (`ThrottlingException`, `ConditionalCheckFailedException`,
> `NoSuchKey`) rather than on the message text.

↳ **If pushed — write your own backoff?** Drill #10 in §4: exponential backoff with full jitter.
Jitter matters because a thousand clients retrying on the same schedule just re-create the spike.

---

**Q. 🔥 Walk me through Lambda's lifecycle and cold starts. How do you reduce them for Python?**

> A new execution environment goes through **Init** (download the code, start the runtime, run
> your module-level code), then **Invoke** (your handler), and the environment stays warm for
> reuse. A cold start is paying Init on a request. For Python, the levers are:
> - Keep the deployment package small, and don't import heavy libraries you don't need.
> - Lazy-import rarely used heavy modules inside the code path that needs them.
> - Create clients once, at module scope.
> - Give the function more memory. CPU scales with memory (about one vCPU at 1,769 MB), so Init
>   gets faster too, and it can end up *cheaper* because it finishes faster.
> - For latency-critical paths: **provisioned concurrency**, which keeps environments pre-warmed,
>   or **SnapStart**, which now supports Python.

↳ **If pushed — reserved vs provisioned concurrency?** Reserved concurrency *caps and guarantees*
how many concurrent environments a function can use. It protects the rest of the account and the
downstream database. Provisioned concurrency *pre-initialises* environments to remove cold
starts, and you pay for it while it's on. One is a limit; the other is a warm pool.

---

**Q. Lambda limits you design around?**

> A 15-minute maximum timeout. Memory up to 10 GB. `/tmp` up to 10 GB. A 250 MB unzipped
> package including layers, or 10 GB as a container image. A 6 MB synchronous request/response
> payload. And a regional concurrency quota, 1,000 by default, which is a soft limit. The
> payload one bites first. Never push a file *through* API Gateway and Lambda; hand the client a
> presigned S3 URL instead.

---

**Q. How do you share code and dependencies across Lambdas?**

> Layers for shared libraries, or container images when the dependencies are large or native,
> like NumPy or anything ML. I prefer building each function's package in CI with its own pinned
> dependencies over one giant shared layer, because a layer version bump silently changes every
> function that uses it. And **Powertools for AWS Lambda** as the standard toolkit: `Logger`,
> `Tracer`, `Metrics`, idempotency, batch processing and the API Gateway event handler.

---

## 4 · Python coding drills (tested)

> All 14 live in [`python-drills.py`](python-drills.py) with tests covering the edge cases. Run
> `python3 docs/career/caylent/python-drills.py` and it prints `All 14 drills pass.`
>
> **How to do a coding round in Python:** restate the problem and ask about the edge cases (empty
> input, duplicates, size of n); say the brute force and its complexity; then write the better
> version *while talking*; then walk one example through your code by hand; then give time and
> space complexity. Silence is the thing that fails people, not the bug.
>
> 1–8 are the classic patterns. 9–14 are the practical ones a cloud consultancy is more likely
> to ask: "flatten this JSON", "add retries", "batch these writes", "summarise these logs".

<!-- DRILLS:START -->

**Imports used across the drills** (top of `python-drills.py`):

```python
from __future__ import annotations

import random
import re
import time
from collections import Counter, OrderedDict, defaultdict, deque
from collections.abc import Callable, Iterable, Iterator
from functools import wraps
from itertools import islice
from typing import Any, TypeVar

T = TypeVar("T")
```

**1. Two Sum** — hash map, O(n) time, O(n) space

```python
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}  # value -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return seen[target - n], i
        seen[n] = i
    return None
```

**2. Group anagrams** — defaultdict keyed on a canonical form, O(n * k log k)

```python
def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: defaultdict[str, list[str]] = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())
```

**3. Top-K frequent** — Counter.most_common is a heap under the hood, O(n log k)

```python
def top_k_frequent(items: list[str], k: int) -> list[str]:
    return [item for item, _ in Counter(items).most_common(k)]
```

**4. Valid parentheses** — stack, O(n)

```python
def is_valid_brackets(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
```

**5. Longest substring without repeating characters** — sliding window, O(n)

```python
def longest_unique_substring(s: str) -> int:
    last_seen: dict[str, int] = {}
    start = best = 0
    for i, ch in enumerate(s):
        if last_seen.get(ch, -1) >= start:
            start = last_seen[ch] + 1  # jump past the previous copy
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best
```

**6. Merge intervals** — sort by start, then sweep, O(n log n)

```python
def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[tuple[int, int]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged
```

**7. LRU cache** — OrderedDict gives O(1) get/put with move_to_end + popitem

```python
class LRUCache:
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self._data: OrderedDict[str, Any] = OrderedDict()

    def get(self, key: str) -> Any | None:
        if key not in self._data:
            return None
        self._data.move_to_end(key)  # mark as most recently used
        return self._data[key]

    def put(self, key: str, value: Any) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)  # evict least recently used
```

**8. Number of islands** — BFS with deque, O(rows * cols)

```python
def count_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen: set[tuple[int, int]] = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1
            queue = deque([(r, c)])
            seen.add((r, c))
            while queue:
                cr, cc = queue.popleft()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        queue.append((nr, nc))
    return islands
```

**9. Flatten a nested dict/JSON into dotted keys** — the everyday ETL task

```python
def flatten(obj: dict[str, Any], parent: str = "", sep: str = ".") -> dict[str, Any]:
    flat: dict[str, Any] = {}
    for key, value in obj.items():
        path = f"{parent}{sep}{key}" if parent else key
        if isinstance(value, dict) and value:
            flat.update(flatten(value, path, sep))
        elif isinstance(value, list):
            for i, item in enumerate(value):
                item_path = f"{path}{sep}{i}"
                if isinstance(item, dict) and item:
                    flat.update(flatten(item, item_path, sep))
                else:
                    flat[item_path] = item
        else:
            flat[path] = value
    return flat
```

**10. Retry decorator with exponential backoff + full jitter** — (what you wrap around a throttled AWS / Bedrock call)

```python
def retry(
    max_attempts: int = 5,
    base_delay: float = 0.2,
    max_delay: float = 5.0,
    retry_on: tuple[type[BaseException], ...] = (Exception,),
    sleep: Callable[[float], None] = time.sleep,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)  # keeps fn.__name__ / __doc__ for logs and tracebacks
        def wrapper(*args: Any, **kwargs: Any) -> T:
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except retry_on:
                    if attempt == max_attempts - 1:
                        raise  # out of attempts: surface the real error
                    # Full jitter: random point in [0, capped exponential]
                    sleep(random.uniform(0, min(max_delay, base_delay * 2**attempt)))
            raise AssertionError("unreachable")

        return wrapper

    return decorator
```

**11. Batch any iterable into fixed-size chunks** — lazily (S3 delete_objects takes 1,000 keys; DynamoDB batch_write_item takes 25)

```python
def batched(iterable: Iterable[T], size: int) -> Iterator[list[T]]:
    if size <= 0:
        raise ValueError("size must be positive")
    it = iter(iterable)
    while chunk := list(islice(it, size)):
        yield chunk
```

**12. Log aggregation** — top IPs and per-endpoint 5xx rate from access-log lines

```python
LOG_LINE = re.compile(r'^(?P<ip>\S+) .* "(?P<method>[A-Z]+) (?P<path>\S+) [^"]*" (?P<status>\d{3})')


def summarise_logs(lines: Iterable[str], top_n: int = 3) -> dict[str, Any]:
    ips: Counter[str] = Counter()
    totals: Counter[str] = Counter()
    errors: Counter[str] = Counter()
    malformed = 0
    for line in lines:
        m = LOG_LINE.match(line)
        if not m:
            malformed += 1  # count, don't crash — real logs are dirty
            continue
        ips[m["ip"]] += 1
        endpoint = m["path"].split("?", 1)[0]
        totals[endpoint] += 1
        if m["status"].startswith("5"):
            errors[endpoint] += 1
    return {
        "top_ips": ips.most_common(top_n),
        "error_rate": {ep: round(errors[ep] / n, 3) for ep, n in totals.items()},
        "malformed": malformed,
    }
```

**13. Token-bucket rate limiter** — injectable clock so it's testable

```python
class TokenBucket:
    def __init__(self, rate_per_sec: float, capacity: int, clock: Callable[[], float] = time.monotonic) -> None:
        self.rate = rate_per_sec
        self.capacity = capacity
        self.tokens = float(capacity)
        self.clock = clock
        self.updated = clock()

    def allow(self, cost: float = 1.0) -> bool:
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
        self.updated = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False
```

**14. Consume a paginated API as one lazy stream** — the boto3 NextToken shape

```python
def paginate(fetch_page: Callable[[str | None], dict[str, Any]], items_key: str = "Items") -> Iterator[Any]:
    token: str | None = None
    while True:
        page = fetch_page(token)
        yield from page.get(items_key, [])
        token = page.get("NextToken")
        if not token:
            return
```

<!-- DRILLS:END -->

**Idioms that make Python answers look fluent**

| Instead of | Write |
|---|---|
| `for i in range(len(xs)): x = xs[i]` | `for i, x in enumerate(xs)` |
| manual counting dict | `Counter(xs)` / `defaultdict(int)` |
| `if k in d: d[k].append(v) else: d[k] = [v]` | `defaultdict(list)` or `d.setdefault(k, []).append(v)` |
| `list.pop(0)` as a queue | `collections.deque.popleft()` |
| sort then slice for top-k | `heapq.nlargest(k, xs, key=...)` |
| building a string with `+=` in a loop | `"".join(parts)` |
| nested loops to pair two lists | `zip(a, b)` (`strict=True` on 3.10+) |
| `lambda` for attribute sort | `key=operator.itemgetter("ts")` |
| `@lru_cache` forgotten | `functools.cache` for memoised recursion |

---

## 5 · AWS core services

> ⚠️ Claim boundary first — see [`README.md`](README.md#the-aws-claim-boundary--read-this-first).
> The answers below are what a strong 2–4-year engineer should know. Where you have hands-on
> evidence, say it; where you don't, "I know how it works and why, and I've done the equivalent
> with X" is a strong answer. A bluff gets caught in one follow-up.

**Q. 🔥 When do you pick Lambda vs ECS/Fargate vs EC2?**

> **Lambda:** event-driven, bursty, short work under 15 minutes, like API backends with uneven
> traffic, S3 or queue processors and glue. There's zero idle cost and nothing to patch.
> **Fargate (ECS):** containers without managing servers. It fits long-running services, steady
> traffic, work past 15 minutes, WebSocket servers, or an existing Dockerised app. **EC2:** when
> I need control, like GPUs, specific instance types, licensed software or very steady high load
> where reserved or spot pricing wins, and I accept owning patching and scaling.
>
> The honest heuristic: start serverless, and move a workload when its traffic is steady enough
> that Lambda's per-request pricing loses to an always-on container, or when a limit forces it.

🔗 *Yours:* everything you've shipped is Dockerised with Compose, so "take this containerised
service to Fargate" is a short hop for you. That's a real bridge, not a bluff.

---

**Q. 🔥 Explain Lambda's three invocation models. Why does it matter?**

> **Synchronous:** API Gateway or a direct invoke. The caller waits, errors go back to the caller,
> and there are no automatic retries.
> **Asynchronous:** S3, SNS, EventBridge. Lambda queues the event internally and retries twice on
> failure. You configure a DLQ or an on-failure **destination** so failed events aren't lost.
> **Poll-based (event source mapping):** SQS, Kinesis, DynamoDB Streams. Lambda polls and invokes
> with batches. For SQS, a failure makes the messages visible again after the visibility timeout,
> and you return `batchItemFailures` so only the failed messages retry, not the whole batch.
>
> It matters because retry behaviour, ordering and error handling are completely different in
> each. "My Lambda failed" means three different things depending on who invoked it.

↳ **If pushed — SQS visibility timeout for a Lambda consumer?** At least six times the function
timeout, which is AWS's own guidance. Otherwise a message becomes visible again while the first
invocation is still working on it, and you process it twice. Pair it with a DLQ and a
`maxReceiveCount`.

---

**Q. 🔥 API Gateway: REST vs HTTP API? How do you do auth? What's the timeout problem?**

> **HTTP API** is cheaper, faster and simpler, with JWT authorizers built in. It's my default.
> **REST API** when I need its extras: usage plans and API keys for third parties, request
> validation, WAF, caching, or the older integrations. There's a separate **WebSocket API** for
> push.
>
> **Auth:** a JWT authorizer against Cognito or any OIDC provider for users; IAM auth (SigV4) for
> service-to-service; a Lambda authorizer for custom logic, with its result cached.
>
> **Timeout:** the integration timeout is 29 seconds by default. So anything that might run long,
> like an LLM call on a big document, goes async: return `202` with a job id, do the work behind a
> queue or Step Functions, and let the client poll a status endpoint or get a WebSocket push.

---

**Q. 🔥 S3 — what do you need to know beyond "it stores files"?**

> - **Consistency:** strong read-after-write for all operations, so read-your-own-write works.
> - **Presigned URLs:** the client uploads or downloads directly with S3, using a short-lived
>   signed URL my API issues after an auth check. Big files never pass through my compute, which
>   also dodges Lambda's payload limit.
> - **Events:** object-created notifications go to Lambda, SQS or EventBridge. That's the start of
>   most processing pipelines.
> - **Storage classes and lifecycle:** Standard → Infrequent Access → Glacier tiers by age, or
>   Intelligent-Tiering when access is unpredictable, with lifecycle rules to expire or transition.
> - **Security:** Block Public Access on; bucket policy plus IAM; SSE-S3 or SSE-KMS encryption;
>   versioning for anything you can't afford to lose.
> - **Performance:** about 3,500 writes and 5,500 reads per second *per prefix*, so the key design
>   spreads load. Multipart upload for large objects.

↳ **If pushed — key design?** Mirror the query: `tenant/yyyy/mm/dd/<id>.json`. Then listing,
lifecycle rules and Athena partitions all work on prefixes.

🔗 *Yours:* the D.Hive kit's recording-storage design (`../dhive/interview-qa.md` §3) is this
exact thinking: dumb, cheap object storage plus a smart, small index in a database.

---

**Q. 🔥 RDS vs DynamoDB — how do you choose?**

> **RDS / Aurora (Postgres)** when the data is relational, the queries are ad hoc or will change,
> and I need joins, transactions across entities, or reporting. **DynamoDB** when the access
> patterns are known up front, I need predictable single-digit-millisecond latency at any scale,
> and the workload is key-value or simple one-to-many, especially from Lambda, where it has no
> connection-pool problem.
>
> The deciding question is "do we know every query today?" If yes, and scale or latency matters,
> DynamoDB. If analysts or product will ask new questions next quarter, Postgres.

↳ **If pushed — Lambda + RDS problem?** Each concurrent Lambda environment opens its own
connections, so a traffic spike exhausts the database's connection limit. The fix is **RDS
Proxy**, which pools connections, plus opening the connection outside the handler so warm
invocations reuse it. Or use DynamoDB for that path.

↳ **If pushed — Multi-AZ vs read replicas?** Multi-AZ is **availability**: a synchronous standby
in another AZ with automatic failover. In the classic setup, you can't read from the standby.
Read replicas are **read scaling**: asynchronous copies, so reads can be slightly stale.
Different problems.

🔗 *Yours:* PostgreSQL is your depth: multi-tenant schemas in GIBP and Resite, pgvector in pSEO,
and offline edge↔cloud sync in LACS. Lead with that. "Aurora Postgres is Postgres" is true, and
it's a strong position.

---

**Q. 🔥 Design a DynamoDB table for orders: get an order, list a customer's orders by date, list orders by status.**

> Access patterns first, then keys. A single table:
> - `PK = CUSTOMER#<id>`, `SK = ORDER#<iso-date>#<orderId>`. Listing a customer's orders by date
>   is a `Query` on PK with `SK begins_with ORDER#`, and date ranges become `between`.
> - Get an order by id alone: a GSI with `GSI1PK = ORDER#<orderId>`.
> - By status: a GSI with `GSI2PK = STATUS#<status>`, `GSI2SK = <date>`. Watch that one: a
>   status like `PENDING` becomes a hot partition at scale, so I'd shard the key
>   (`STATUS#PENDING#<0-9>`) or reconsider whether that query belongs in DynamoDB at all.
>
> Other things I'd mention: GSIs are eventually consistent; the item limit is 400 KB, so large
> blobs go to S3 with the key stored in the item; on-demand capacity to start, provisioned with
> auto-scaling once traffic is predictable; TTL for expiring data; and Streams to react to
> changes.

↳ **If pushed — optimistic locking / idempotency in DynamoDB?** A `ConditionExpression`. Use
`attribute_not_exists(pk)` to make "create" idempotent, or `version = :expected` to make updates
safe under concurrency. A failed condition raises `ConditionalCheckFailedException`, which you
catch and handle.

🔗 *Yours:* honest: DynamoDB isn't something you've shipped. The modelling instinct (access
patterns first, tenant or entity on the partition key) is the same one you used in the D.Hive
prep, and your multi-tenant Postgres work is the real evidence.

---

**Q. 🔥 IAM — how does permission evaluation work? What's least privilege in practice?**

> By default, everything is denied. An **explicit allow** grants access, and an **explicit deny**
> anywhere overrides every allow. Identity policies, resource policies (like a bucket policy),
> permission boundaries, SCPs from AWS Organizations and session policies all get evaluated
> together. An explicit deny in any of them wins.
>
> Least privilege in practice means **roles, not users with keys**: a Lambda gets an execution
> role scoped to the specific actions and the specific resource ARNs it touches, never
> `"Action": "s3:*", "Resource": "*"`. Humans come in via SSO. CI assumes a role via OIDC. I use
> IAM Access Analyzer to find unused permissions and generate policies from actual activity.

↳ **If pushed — cross-account access?** A role in account B whose trust policy allows account
A's principal to `sts:AssumeRole`, and A's identity allowed to call `sts:AssumeRole` on that ARN.
Both sides have to agree.

---

**Q. VPC basics — and should a Lambda be in a VPC?**

> A VPC has **public subnets** (routed to an Internet Gateway) and **private subnets**, which
> reach the internet only through a NAT Gateway, if at all. **Security groups** are stateful and
> attach to resources, with allow rules only. **NACLs** are stateless, work at the subnet level,
> and allow both allow and deny rules.
>
> A Lambda goes in a VPC **only** if it needs private resources like RDS or ElastiCache. Once
> it's in, it loses internet access unless there's a NAT. So I'd add **VPC endpoints**: gateway
> endpoints for S3 and DynamoDB are free, and interface endpoints cover services like Secrets
> Manager or Bedrock. That keeps traffic private and avoids a NAT Gateway bill.

---

**Q. SQS vs SNS vs EventBridge vs Kinesis?**

| | What it is | Use when |
|---|---|---|
| **SQS** | Queue; one consumer group pulls | Decoupling and buffering work; smoothing spikes; retries + DLQ. FIFO when order per group matters |
| **SNS** | Pub/sub push fan-out | One message to many subscribers (often SNS → multiple SQS queues) |
| **EventBridge** | Event bus with content-based routing rules | Many event types, many consumers, filtering on fields, SaaS/AWS events, scheduling, archive + replay |
| **Kinesis Data Streams** | Ordered, replayable stream per shard | High-throughput streams, ordering per key, multiple independent readers, replay |

> The follow-up is always "exactly once?" and the answer is: assume **at-least-once**
> everywhere and make consumers idempotent. FIFO queues give deduplication within a window, but
> idempotent handlers are what make it safe.

---

**Q. Secrets: Secrets Manager vs Parameter Store?**

> **Secrets Manager** for real secrets that need **rotation**, like database credentials,
> with built-in rotation via Lambda. It costs per secret. **SSM Parameter Store** for config and
> simpler secrets as `SecureString`. The standard tier is free. Either way: never secrets in
> code, never in plain environment variables committed to a repo, and fetch at cold start with
> caching rather than on every invocation.

---

**Q. What are the Well-Architected pillars? Use them.**

> Six: **Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization,
> Sustainability.** In a design discussion I use them as a checklist at the end: "How do we
> deploy and observe it? What's the blast radius if a credential leaks? What happens when an AZ
> or a dependency fails? Where's the bottleneck? What does this cost at 10×?" At a consultancy,
> expect a client-facing Well-Architected review to be part of the job.

---

## 6 · Serverless architecture and orchestration

**Q. 🔥 Step Functions — what is it for, Standard vs Express, and when not to use it?**

> An orchestrator for multi-step workflows defined as a state machine, with **retries, catch
> blocks, timeouts, parallel branches and maps** declared in the definition instead of hand-coded
> in Lambdas. It can also call ~200 AWS services directly (DynamoDB, SQS, Bedrock and more), so
> many steps need no Lambda at all.
>
> **Standard:** long-running, up to a year, exactly-once step execution, full history, priced per
> state transition. That fits business workflows and anything with human approval. **Express:**
> up to 5 minutes, at-least-once, priced by duration. That fits high-volume, short event
> processing.
>
> The patterns I'd name: **Map** (or Distributed Map for millions of S3 objects) for fan-out, and
> **`waitForTaskToken`** to pause until a callback, like a human approving an LLM-drafted output.
> I wouldn't use it for a single step, or when simple choreography through events is enough and
> nobody needs to see the workflow as a whole.

↳ **If pushed — orchestration vs choreography?** Orchestration (Step Functions) means one place
knows the whole flow: easy to see, retry and debug. Choreography (services react to events on
EventBridge) means loosely coupled and independently deployable, but the flow only exists in
your head and your traces. For a client deliverable where someone must answer "where is job
123 stuck?", orchestration wins.

---

**Q. 🔥 How do you make a serverless workflow idempotent?**

> Every unit of work gets an **idempotency key**: the S3 object key plus version, the SQS message
> id, or a client-supplied request id. Before the side effect, do a conditional write to a
> DynamoDB table (`attribute_not_exists(pk)`). If it fails, the work was already done, so return
> the stored result. Records get a TTL so the table doesn't grow forever. Powertools' idempotency
> utility implements exactly this with a decorator.
>
> The side effects that need it most are the ones you can't undo: payments, emails, and calls to
> an external or client system.

🔗 *Yours:* idempotency keys were part of your API work at Wisflux (payments-adjacent in GIBP),
and your BullMQ / pg-boss queues in Resite and pSEO needed idempotent consumers for the same
at-least-once reason. Same discipline, different transport.

---

**Q. How do you handle a downstream that can't keep up, like a rate-limited client API or Bedrock?**

> Put a **queue in front** and control the drain rate. SQS plus a Lambda with **maximum
> concurrency** set on the event source mapping means at most N calls in flight, whatever the
> backlog. Retries use backoff and jitter, poison messages go to a DLQ after N attempts, and I
> alarm on queue age, not just depth. Age tells you whether you're falling behind.

🔗 *Yours:* the pSEO multi-provider router is this story. Typed failover, a 429 persisting a
cooldown on the model's row so the skip is shared across processes, and jobs re-queuing when
every model fails. Story 11 in [`../genai/15-positioning-stories.md`](../genai/15-positioning-stories.md).

---

**Q. Serverless anti-patterns you'd call out in a code review?**

> - **Lambda calling Lambda synchronously**: you pay for both while one waits, and errors
>   compound. Use Step Functions or a queue.
> - **A monolithic "lambdalith"** with a huge package and everything behind one function. It's
>   sometimes fine, but cold starts and blast radius grow.
> - **Recursive triggers**: a Lambda writing back to the bucket that triggers it. Use a separate
>   prefix or bucket.
> - **No DLQ or destination** on async invocations, so failures vanish.
> - **`Resource: "*"` IAM**, and **secrets in environment variables committed to the repo**.
> - **No timeouts on outbound calls**, so one slow dependency burns the full 15 minutes at your
>   expense.

---

## 7 · CI/CD, IaC and observability

**Q. 🔥 Design a CI/CD pipeline for a Python serverless service.**

> **On pull request:** lint (`ruff`), type-check (`mypy`), unit tests (`pytest` with moto),
> dependency and secret scanning, and `cdk synth` / `sam validate` / `terraform plan` so the
> infrastructure diff is reviewed alongside the code.
> **On merge to main:** build the artifact once, deploy to **dev**, run integration and smoke
> tests against real AWS, then promote the *same* artifact to staging and production, with a
> manual approval gate for production if the client wants one.
> **Deploy strategy:** Lambda aliases with **CodeDeploy traffic shifting** (canary, e.g. 10% for
> 5 minutes), tied to CloudWatch alarms that roll back automatically on an error spike.
> **Credentials:** GitHub Actions assumes an AWS role via **OIDC** (`id-token: write`), so there
> are no long-lived access keys stored in the CI system at all.
> **Environments** live in separate AWS accounts under Organizations, so dev can't touch prod.

🔗 *Yours:* GitHub Actions CI/CD and Dockerised dev/prod environments are on your résumé. You
cut deploy time and made releases repeatable. The AWS-specific additions (OIDC role, CodeDeploy
canary) are the delta. Say so plainly.

---

**Q. 🔥 CloudFormation vs CDK vs SAM vs Terraform — which, and why?**

> **CloudFormation** is the engine: declarative YAML or JSON, with state managed by AWS. **SAM**
> is a CloudFormation shorthand for serverless, with a nice local-invoke story. **CDK** means
> writing infrastructure in Python or TypeScript that synthesises to CloudFormation. It's great
> for *reusable constructs*, which is exactly the "reusable assets for repeatable client
> delivery" part of this JD. **Terraform** is multi-cloud with its own state file, and it's what
> many clients already standardise on.
>
> At a consultancy, the honest answer is "whatever the client runs". For internal accelerators,
> I'd lean CDK in Python, because a construct library is how you package "a secure,
> observable Lambda API with our defaults" once and reuse it across engagements.

↳ **If pushed — Terraform state?** Remote state in S3 with locking, never on a laptop. One state
per environment and component, to keep the blast radius small. Plan in CI, and apply only from
the pipeline.

---

**Q. What do you monitor for a serverless app, and how?**

> **Per function:** errors, throttles, duration (p50/p95/p99), concurrent executions, and
> iterator age or queue age for stream and queue consumers. **Per API:** 4xx and 5xx rates and
> latency. **Business metrics** via the Embedded Metric Format, like "documents processed" or
> "LLM cost per job". **Tracing:** X-Ray or OpenTelemetry, so one request can be followed across
> API Gateway, Lambda, SQS and Bedrock. Alarms go on symptoms users feel (error rate, latency,
> queue age), not on every CPU blip, and every alarm should have a runbook line.

---

**Q. 🔥 How do you keep AWS costs under control?**

> Tag everything by project and client, and turn on **AWS Budgets** alerts from day one. The
> usual surprises are **NAT Gateway data processing** (fix: VPC endpoints), **CloudWatch Logs
> ingestion** (fix: log levels, retention policies), idle over-provisioned resources, S3 without
> lifecycle rules, and, now, **LLM tokens**. For Bedrock I'd track tokens and cost per request
> as a metric, cache prompts, use batch inference for offline jobs, and right-size the model per
> task.

---

## 8 · Data engineering: ETL, feature stores, vector DBs

**Q. 🔥 Design a daily ETL from an operational Postgres into something analysts can query.**

> Extract **incrementally** with a watermark (`updated_at > last_run`), or with CDC via DMS if
> the volume or freshness needs it, so each run doesn't re-read the whole table. Land the raw
> data in S3 as-is, the *bronze* layer. Transform into cleaned, typed **Parquet partitioned by
> date**, the *silver* layer. Catalogue it in the **Glue Data Catalog** and query it with
> **Athena**. Orchestrate with Step Functions or Glue workflows, or Airflow (MWAA) if the client
> already has it.
>
> The property I'd insist on is **idempotent re-runs**. A run for date D *overwrites* partition D
> rather than appending, so a failed or repeated run never duplicates rows. And data-quality checks
> (row counts, nulls in key columns, schema drift) fail the pipeline loudly instead of letting it
> publish bad data.

↳ **If pushed — ETL vs ELT?** ETL transforms before loading. ELT loads raw data into the
warehouse or lake first and transforms there with SQL or dbt. ELT is the modern default, because
storage is cheap and keeping the raw data means you can re-transform when the logic changes.

↳ **If pushed — why Parquet?** It's columnar and compressed, so Athena scans only the columns
and partitions you query. That's usually a 10× or better cost and speed difference over CSV or
JSON.

🔗 *Yours:* SmartTrader ingests and backtests across the full NSE universe, Python-side. Market
data ingestion, cleaning and time-series storage is ETL in everything but name. Talk about the
data shape, the idempotency of re-ingestion, and the backtest correctness concerns (look-ahead
bias is the finance version of a data leak).

---

**Q. What is a feature store and why does it exist?**

> A central place to define, compute and serve ML features, so training and inference use the
> **same** feature definitions. It has an **offline store** (historical, for training, with
> point-in-time-correct joins so you never train on data that didn't exist yet at prediction
> time) and an **online store** (low-latency, latest values, for real-time inference). The
> problem it solves is **training/serving skew**: a feature computed one way in a notebook and
> another way in production. SageMaker Feature Store is the AWS option, and Feast is the
> open-source one.

🔗 *Yours:* point-in-time correctness is exactly the look-ahead-bias discipline from your
walk-forward and meta-labeling work in the trading systems. Say it that way.

---

**Q. 🔥 Vector databases — what are they, what are the options on AWS, and how do you choose?**

> A vector database stores embeddings and answers nearest-neighbour queries, usually with an
> approximate index like **HNSW** (a graph: fast and accurate, memory-hungry) or **IVFFlat**
> (clusters: cheaper to build, needs a good number of lists and probes). On AWS:
> **Aurora/RDS Postgres with pgvector** when you already run Postgres and want vectors next to
> relational data with SQL filtering. **OpenSearch** (Serverless or managed) when you want
> hybrid keyword and vector search at scale. Both plug into Bedrock Knowledge Bases, alongside
> third-party options like Pinecone.
>
> How I choose: data size, whether I need metadata filtering and hybrid search, operational
> appetite, and what the client already runs. For most first builds, pgvector is enough and it's
> one less system.

🔗 *Yours:* pgvector in pSEO for semantic dedup, Qdrant in the agent platform, sqlite-vec in UACE.
Three different vector stores in real code is a strong answer. Your hybrid BM25 + embedding
retrieval with RRF in repo-intelligence goes deeper than most candidates will.

---

**Q. How do you chunk documents for RAG?**

> Chunk by **structure** first (headings, sections, paragraphs, or functions for code), then
> by size within that, with some overlap so a fact split across a boundary still lands whole in
> one chunk. Keep metadata (source, page, section, tenant) on every chunk for filtering and
> citations. Then **measure** retrieval quality on a labelled question set rather than guessing
> the chunk size.

🔗 *Yours:* symbol-boundary chunking in repo-intelligence, and Story 9: measuring against
labelled ground truth and reporting a result that went against your own hypothesis.

---

## 9 · GenAI on AWS: Bedrock and Claude

> This is Caylent's identity: an AWS Premier Tier partner, 500+ AI workloads on Bedrock by their
> own count, and a charter member of Anthropic's Claude Partner Network, with a dedicated Claude
> practice (ACE) launched in April 2026. The JD only asks for "familiarity", but this is the
> section where you can stand out, because you've actually built with LLMs.

**Q. 🔥 What is Amazon Bedrock, and why would a client use it instead of calling a model provider directly?**

> Bedrock is AWS's managed service for foundation models: Anthropic's Claude, Amazon's own
> models, Meta's Llama and others, behind one API. For an enterprise client the pull is
> **governance**, not the models. Access is controlled by **IAM**. Traffic can stay private via
> **VPC endpoints**. Usage lands on the existing **AWS bill** and in **CloudTrail**. Data stays in
> their AWS environment and isn't used to train the models. And it composes with the rest of
> their stack: Lambda, Step Functions, S3, Knowledge Bases, Guardrails.
>
> Calling Anthropic's API directly gets you the newest features first. Bedrock gets you the
> enterprise wrapper. A lot of Caylent's work is presumably exactly that trade-off for a given
> client.

↳ **If pushed — the API?** The **Converse API** is the model-agnostic one: same message format
across models, with tool use, streaming via `converse_stream`, and a usage block for tokens.
`InvokeModel` takes the provider's native request body.

```python
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

resp = bedrock.converse(
    modelId=MODEL_ID,  # a Claude model or inference-profile ID enabled in the account
    system=[{"text": "You summarise contracts for a legal ops team. Be precise."}],
    messages=[{"role": "user", "content": [{"text": f"Summarise:\n\n{document}"}]}],
    inferenceConfig={"maxTokens": 1024},
)
text = resp["output"]["message"]["content"][0]["text"]
tokens = resp["usage"]  # inputTokens / outputTokens: log these, they are the bill
```

> (Anthropic's own Python SDK also ships a Bedrock client, if a team would rather write against
> the Claude Messages API shape.)

---

**Q. 🔥 Build a RAG assistant on AWS. Knowledge Bases, or build it yourself?**

> **Bedrock Knowledge Bases** is managed RAG. Point it at an S3 data source, and it chunks,
> embeds, stores in a vector store (OpenSearch Serverless, Aurora pgvector and others), and
> gives you a retrieve or retrieve-and-generate API with citations. It's the fastest route to a
> credible POC, which matters in a pre-sales or first-engagement setting.
>
> **Build it yourself** when retrieval quality is the product: custom chunking (code, tables,
> legal structure), hybrid keyword and vector search, reranking, per-tenant filtering, or tight
> control of cost and latency.
>
> My approach with a client would be to start on Knowledge Bases to prove value in days,
> **build an evaluation set on day one** (real questions with known right answers), and only
> move pieces custom where the eval shows the managed default is the bottleneck.

↳ **If pushed — how do you evaluate RAG?** Separate **retrieval** from **generation**. For
retrieval: did the right chunks come back (recall@k, MRR) on a labelled set? For generation: is
the answer grounded in those chunks, and correct? Use an LLM-as-judge with a rubric, spot-checked
by humans. Every change to chunking, the prompt or the model gets re-run against the set before
it ships.

🔗 *Yours:* this is your strongest ground. Story 9 (the eval that said you were wrong) and
Story 10 (the citation validator that refuses to answer when more than 30% of claims fail
verification). Most candidates have never measured retrieval at all.

---

**Q. 🔥 What's an agent, and how would you build one on AWS?**

> An agent is a model in a loop: it decides which tool to call, your code executes it, the result
> goes back, and it repeats until the task is done. The engineering is in the tools and the
> guardrails, not the loop. That means clear tool names and descriptions, strict input schemas,
> idempotent tools, human approval before irreversible actions, and a budget on steps and
> tokens.
>
> On AWS, the options run from **your own loop** (Lambda or Step Functions calling the Converse API
> with tool definitions) through **Bedrock Agents** (action groups backed by Lambda and an OpenAPI
> schema) to **Bedrock AgentCore**, which provides production plumbing like runtime, memory,
> identity, a gateway that exposes APIs as MCP tools, and observability. And **MCP** is the open
> standard for connecting a model to tools and data, which Anthropic created.

🔗 *Yours:* you've **published two MCP servers** (UACE: 18 tools and 2 prompts on npm; the Inbox
Agent with a server-enforced two-phase `send_reply` confirm). Story 12: "guardrails for agents
have to live outside the model". That's exactly the maturity a Claude partner wants to hear.

---

**Q. How do you make LLM output reliable enough to feed into code?**

> Ask for **structured output** against a schema, via tool use with a strict JSON schema or the
> API's structured-output mode, rather than parsing prose. Then **validate** with Pydantic at the
> boundary anyway. On failure, retry with the validation error included, and after N failures
> route to a fallback or a human rather than guessing. Everything is logged with the prompt
> version, so a bad output can be traced to what produced it.

🔗 *Yours:* the JSON-repair layer and typed failover in the pSEO router.

---

**Q. How do you control LLM cost and latency?**

> Use the smallest model that passes the eval for each step, since classification rarely needs
> the biggest model. Use **prompt caching** for the long, stable prefix (system prompt, tool
> definitions, a big document asked about repeatedly): Claude caches by exact prefix, and cached
> reads cost a fraction of normal input. Keep volatile content like timestamps *after* the
> cached part, or you'll never get a cache hit. Use **batch inference** for offline jobs, which
> Bedrock prices at roughly half of on-demand. Stream responses so users see the first tokens
> fast. And track tokens and cost per request as a first-class metric, per client.

↳ **If pushed — throttling on Bedrock?** Bedrock has per-account, per-model quotas, so you'll see
`ThrottlingException` under load. Retry with backoff and jitter (adaptive retry mode in boto3),
queue in front with capped concurrency (§6), use **cross-region inference profiles** to spread
load across regions, and buy provisioned throughput only when usage is steady and proven.

---

**Q. Guardrails and safety — what would you put around a client-facing GenAI feature?**

> **Bedrock Guardrails** for content filters, denied topics, PII detection and redaction, and
> contextual grounding checks. Plus the application-level things no managed service does for
> you: treat retrieved documents and user input as **data, not instructions** (prompt
> injection); give tools least privilege; require human approval before irreversible actions;
> scope retrieval per tenant so one client's documents never reach another's answer; and keep an
> audit log of prompts and outputs.

---

**Q. 🔥 Have you used Claude or Claude Code? How?**

> Daily. I use Claude Code as my main engineering tool, with a **documentation-first,
> phase-gated workflow** I built as custom skills: create feature docs, review them for gaps,
> execute one ≤500-line phase per PR, then verify against a test plan. That makes an AI coding
> agent predictable enough to trust on real work. It's reviewable slices instead of big-bang
> diffs. I've also built MCP servers that plug into it: UACE gives Claude Code, Cursor and Copilot
> a shared local project memory.
>
> That maps directly onto what I understand Caylent's Claude practice does: an **Agentic SDLC**
> track that brings Claude Code into client engineering teams, and an **Applied AI** track with
> forward-deployed engineers building Claude-powered systems. I've been doing the first one for
> myself.

*(Say this with specifics. It's a differentiator only if it sounds like lived practice, not a
buzzword list.)*

---

## 10 · Design prompts they're likely to give

> Use the same skeleton every time: **clarify requirements and scale (2 min) → API and data flow
> → components → data model → failure modes → security → cost → what I'd do next.** Draw as you
> talk. Name trade-offs out loud; that's what's being scored.

### A · 🔥 "A client uploads thousands of PDFs a day. Extract key fields, summarise with an LLM, make results searchable."

> **Clarify:** document sizes and types (scanned or digital?), volume and peak, latency (minutes
> is fine?), which fields, multi-tenant?, and compliance (PII, data residency).
>
> **Flow:**
> 1. Client gets a **presigned S3 URL** from `POST /documents` (API Gateway + Lambda), uploads
>    directly, and gets back a `documentId`. Status is `PENDING` in DynamoDB.
> 2. The **S3 event → EventBridge (or SQS) → Step Functions** execution per document.
> 3. **Extract:** **Textract** for scanned PDFs (the async API for multi-page documents), or a
>    Python library for digital ones.
> 4. **Chunk** if large, then use a **Map** state to call **Bedrock (Claude)** per chunk with a
>    structured-output schema for the fields, then a reduce step to merge and summarise.
> 5. **Validate** the output with Pydantic. On failure, retry, then route to a
>    **`waitForTaskToken` human review** step.
> 6. **Store** fields and summary in DynamoDB (status `DONE`); index text and embeddings in
>    OpenSearch or pgvector for search.
> 7. **Notify** via EventBridge → webhook or email; `GET /documents/{id}` returns status.
>
> **Failure modes:** Bedrock throttling (capped concurrency on the Map, backoff, DLQ); poison
> PDFs (catch → `FAILED` with reason, never silently dropped); duplicate events (idempotency key
> = object key + version). **Security:** per-tenant S3 prefixes and KMS keys, least-privilege
> roles per step, PII redaction via Guardrails if required. **Cost:** a smaller model for field
> extraction and a larger one only for the summary; prompt caching for the fixed instructions;
> batch inference if the SLA allows overnight processing.

### B · "Build a serverless REST API for a client's internal tool — CRUD plus reports."

> API Gateway HTTP API with a JWT authorizer (Cognito or the client's IdP) → Lambda (Python,
> Powertools event handler) → **DynamoDB** if access patterns are fixed, **Aurora Postgres + RDS
> Proxy** if reporting is ad hoc. Heavy reports go async: a queue, a worker, results to S3, and a
> presigned download link. IaC in CDK or SAM, CI via GitHub Actions with OIDC, canary deploys with
> alarm rollback, structured logs plus X-Ray, and Budgets alerts. Then close on what I'd ask the
> client: expected users, data retention, and who operates it after hand-over.

### C · "Our support team wants an assistant that answers from our docs and ticket history."

> RAG over docs and resolved tickets. Start with Bedrock Knowledge Bases over S3 for speed, with a
> **metadata filter per product and tenant**, and an **eval set of 50–100 real past questions**
> with the known right answers built in week one. The answer shows **citations**, and "I don't
> know" is an allowed and measured outcome. Keep a human in the loop: the assistant *drafts*, the
> agent sends. Feedback buttons feed the eval set. Guardrails for PII in tickets. Measure deflection
> rate and answer acceptance, not just "it works".

### D · "How would you build a reusable accelerator for our AI Center of Excellence?"

> Package the thing every engagement rebuilds: for example, a **CDK construct library** plus a
> **project template** that stands up a secure, observable GenAI service with the defaults baked
> in. That means a Bedrock client with retries and cost logging, prompt templates under version
> control, an eval harness wired into CI, Guardrails, least-privilege roles, structured logging
> and dashboards. It's versioned and documented, with a working example, and it's opinionated
> about the defaults but lets an engagement override them. Success means a new engagement goes
> from zero to a deployed, evaluated POC in days, and fixes flow back into the library.

🔗 *Yours:* StreamVerse and UACE are exactly this: you took something every team re-implements
and packaged it behind a small, published API. And the design tension you already know from
StreamVerse ("hide too little and you haven't helped, hide too much and people get stuck") is
the core accelerator question.

---

## 11 · Project grilling

> 90-second shape: **problem → what I built → the hard part → a decision and its trade-off →
> outcome → a hook.** For this interview, pick projects that show **Python**, **cloud
> deployment** and **LLMs**. Every number must be one you can defend.

### SmartTrader — your Python-plus-services story

> SmartTrader is an algorithmic trading platform for the Indian stock market. It backtests 28
> strategies, runs a live market scanner, and pushes real-time alerts over WebSockets and
> Telegram. It's an Nx monorepo with a deliberate polyglot split. **NestJS** owns the platform
> side: users, APIs and the real-time layer. **Python FastAPI** owns the analytical work, because
> the Python ecosystem for numerical and financial analysis has no Node equivalent. Docker
> Compose holds the boundary between them.
>
> The hard part is correctness, not speed. A backtest that accidentally uses tomorrow's data looks
> brilliant and is worthless, so the data pipeline has to be strict about point-in-time data and
> realistic costs.
>
> *Hook:* "the Node/Python split is the design decision I'd defend — happy to go into where the
> boundary sits and why."

### The trading-research systems — your "learned something hard in Python" story

> Story 5 in [`../story-bank.md`](../story-bank.md). A 12-strategy engine with scikit-learn
> meta-label filters, walk-forward and Monte-Carlo robustness testing, and a custom Gymnasium
> environment for reinforcement learning (PPO / A2C / SAC) that models real NSE costs like STT,
> slippage and stamp duty. It's research and paper trading, so say it that way.

### pSEO multi-LLM router — your production GenAI story

> Story 11: the fallback chain lives in a Postgres table, not code. 429s persist a cooldown shared
> across processes, typed errors decide retry vs fail-fast, and cost is recorded per call. In
> production at pseo.cloud. *(It's TypeScript. Be clear about that if they ask what language.)*

### LACS — your deployment-and-operations story

> A deployed disaster-response platform: Docker Compose stacks on field mini-PCs (edge) plus a
> cloud sync node, offline-first Postgres sync, one-touch provisioning, and on-device speech
> recognition with faster-whisper on the cloud node. Python is on the ASR serving side. Your
> claim boundary there: *"I own the serving side — engine selection, quantisation and the
> hallucination mitigation"* (per
> [`../genai/15-positioning-stories.md`](../genai/15-positioning-stories.md)).

### UACE / MCP — your Claude-ecosystem story

> Story 15. A published MCP server for Claude Code, Cursor and Copilot. Vectors are an
> enhancement, never a dependency, and it calls no LLM itself. It's infrastructure the model
> consumes. That line lands well with a Claude partner.

---

## 12 · Behavioural and positioning

**Q. 🔥 Tell me about yourself.** *(90 seconds.)*

> I'm a software engineer with four years at Wisflux Tech Labs here in Jaipur, building
> production systems end to end: backend services in Python and Node, data in PostgreSQL,
> everything containerised and shipped through CI/CD.
>
> The work I'd point to: a deployed disaster-response platform, with edge devices that run
> offline and sync to the cloud; a multi-tenant fintech platform; and, on the Python side, a
> trading platform where FastAPI services do the analytics and backtesting. Over the last two
> years a lot of my work has moved into LLM systems: a multi-provider model router in production,
> retrieval systems I evaluated against labelled data, and two MCP servers I've published. I use
> Claude Code daily with a phase-gated workflow I built.
>
> What draws me to Caylent is the combination: AWS, Python, and taking AI from a prototype into
> production for real clients, as reusable assets rather than one-offs. That's the direction
> I've been heading on my own, and I'd like to do it at your scale.

---

**Q. 🔥 Why Caylent? Why consulting, after product work?**

> Two reasons. First, **breadth at depth**: in consulting I'd see many architectures and many
> clients' real problems in a year, which compresses experience. Second, **the AI-to-production
> gap** is exactly where I've been spending my own time. Caylent is one of the few firms sitting
> at the intersection of AWS and Anthropic, with a dedicated Claude practice, so I'd be learning
> from people who've shipped hundreds of these workloads.
>
> And I *like* building reusable things. StreamVerse and UACE both exist because I noticed teams
> rebuilding the same thing. The CoE part of this role is that instinct as a job description.

---

**Q. This is through BOT Consulting's GCC model. How do you feel about that?**

> Know the model: BOT **builds** the team in Jaipur, **operates** it as an extension of the
> client under agreed KPIs, then **transfers** the GCC to the client. Answer: *"I'm comfortable
> with it. It's a common way to stand up a GCC, and being in the founding team of Caylent's India
> centre is appealing. I'd like to understand the timeline and what the transfer means for my
> employment terms."* Then actually ask (§14).

---

**Q. Tell me about explaining something technical to a non-technical stakeholder.**

> Use LACS: the users are disaster responders, not engineers, and the "offline-first" behaviour
> had to be explained in terms of what they'd see ("your messages will send when the link comes
> back, and here's how you'll know"), not sync protocols. Or the ATR Open House in Kyoto:
> presenting the system to an international audience. Consulting rounds always ask this, so
> have one ready.

---

**Q. Tell me about a time requirements were ambiguous. / You built a POC.**

> Story 1 (LACS: shipping under ambiguity) or Story 9 (repo-intelligence: making the first phase
> a *stop-or-continue gate* on whether the core hypothesis held). The second one is the better
> fit for a POC-heavy role: *"I defined up front what result would make us stop."*

---

**Q. A time you disagreed with a senior engineer or architect.**

> Pick a real one. The shape they want: you raised it with evidence, not opinion; you proposed an
> experiment or a small test; you committed fully once the decision was made, even when it went
> against you; and you say what you learned. Never make the other person the villain.

---

**Q. Biggest mistake / failure.**

> Story 14, the zero-vector embedding bug: a `catch` returned a plausible default, silently
> poisoning an agent's memory. The lesson is "in AI systems, the dangerous failures are the ones
> that don't throw." It's real, technical, and yours, and it shows a systemic fix.

---

**Q. You're at the top of our 2–4-year band. Why this level?**

> *"I'm looking for the right team and problems more than the title. Four years at one company
> gave me end-to-end ownership. What I haven't had is AWS at client scale and a large team of
> specialists to learn from. That's the trade I want."* Don't undersell. Your scope is
> senior-leaning, and the level should be negotiated at offer time, not conceded now.

---

**Q. Salary, notice, joining.**

> You've already given the recruiter: expected **₹14 LPA (negotiable)**, **60 days' notice**. In a
> technical round, don't reopen it: *"I've shared my expectations with the TA team; I'm focused
> on whether this is the right fit."* If they raise it anyway, hold the number, and don't
> revise it downward. Hybrid in Jaipur: yes, you're local.

---

## 13 · Honest gaps

The rule: **name the gap, give the nearest real thing you've done, give the time to close it.**
Never claim it, never apologise for it, never volunteer more gaps than you were asked about.

| Gap | Say this |
|---|---|
| **Production AWS depth** | "My production deployments have been Docker on Linux hosts and managed platforms, with CI/CD in GitHub Actions. I know the core AWS services well at the design level — Lambda's invocation models, IAM evaluation, S3, DynamoDB modelling — and I've been building on them directly. What I haven't had is AWS at client scale, which is a big part of why this role appeals." *(Adjust to what's true. See the README's claim boundary.)* |
| **DynamoDB** | "Postgres is my depth. I model DynamoDB access-patterns-first — PK/SK, GSIs, conditional writes for idempotency — but I'd want review on my first real table design." |
| **Step Functions / EventBridge** | "Not in production. I've built the same guarantees by hand with job queues — retries, DLQs, idempotent consumers, status tracking — which is exactly what Step Functions gives you declaratively." |
| **Terraform / CDK** | "My infrastructure has been Docker Compose, systemd and CI scripts. I understand declarative IaC and state. CDK in Python is where I'd start, and I'd expect to be productive quickly." |
| **Bedrock hands-on** | "My LLM production work is against provider APIs directly — a multi-provider router with failover and cost tracking. Bedrock's Converse API is the same shape with AWS governance around it. The concepts transfer one-to-one." |
| **Kubernetes** | "Docker and Compose in production, including on edge hardware. I haven't operated a cluster." |
| **Spark / Glue at scale** | "My data work is Python and Postgres at single-node scale. I know the lake pattern — Parquet, partitioning, Athena, idempotent partition overwrites — but not large Spark jobs." |
| **AWS certification** | "Not yet." *Only* add "I'm working toward Solutions Architect Associate" if you actually are. Caylent likely supports certifications, so ask about it in §14. |
| **Java / Go** | Not a gap: the JD says Python plus *one* more language, and you have **TypeScript/JavaScript** at production depth. Say that confidently. |

---

## 14 · Questions to ask them

Ask three or four. Pick the ones whose answers change how you'd approach the job.

**About the role**
1. Which team would I be in: the Claude/ACE practice, a cloud-native development team, or the AI Center of Excellence? What would my first 90 days look like?
2. The JD mentions building assets and automations for repeatable client delivery. Could you give an example of one the team has built, and how it gets reused?
3. How much of the work is client-facing, and how does the India team work with US clients and timezones?
4. How does the team use Claude Code internally? *(Opens the door to §9's last answer if you haven't used it yet.)*

**About the model**
5. How does the BOT model work for this team: who is the employer of record at the start, and what's the expected timeline and process for transfer to Caylent?
6. How big is the India team today, and where do you expect it to be in a year?

**About growth**
7. Does Caylent support AWS certifications? Is there an expectation to get one?
8. What separates people who do really well here in their first six months?

**About the process**
9. What does the take-home or case study usually look like, and what do the reviewers weigh most?

---

## Weak-spot tracker

Mark after saying each section out loud. Only re-drill ⚠️ and ❌.

| § | Topic | Pass 1 | Pass 2 | Still weak |
|---|---|---|---|---|
| 1 | Python core | | | |
| 2 | Python in production | | | |
| 3 | boto3 & Lambda | | | |
| 4 | Coding drills | | | |
| 5 | AWS core services | | | |
| 6 | Serverless architecture | | | |
| 7 | CI/CD, IaC, observability | | | |
| 8 | Data engineering | | | |
| 9 | GenAI on AWS | | | |
| 10 | Design prompts | | | |
| 11 | Project grilling | | | |
| 12 | Behavioural | | | |
| 13 | Honest gaps | | | |

---

## What's not here

| Looking for | Go to |
|---|---|
| Deeper GIL / asyncio / FastAPI answers | [`../interview-qa/04-python-fastapi.md`](../interview-qa/04-python-fastapi.md) |
| Docker, CI/CD, Nginx, Linux | [`../interview-qa/06-devops-infra.md`](../interview-qa/06-devops-infra.md) |
| Postgres depth, indexes, pgvector | [`../interview-qa/05-databases.md`](../interview-qa/05-databases.md) |
| RAG, evals, agents in depth | [`../genai/03-rag.md`](../genai/03-rag.md), [`04-evals.md`](../genai/04-evals.md), [`05-agents.md`](../genai/05-agents.md) |
| More coding practice (JS) | [`../interview-qa/09-coding-arrays-strings.md`](../interview-qa/09-coding-arrays-strings.md) · [`10-coding-structures-dp.md`](../interview-qa/10-coding-structures-dp.md) |
| STAR stories | [`../story-bank.md`](../story-bank.md) · [`../genai/15-positioning-stories.md`](../genai/15-positioning-stories.md) |
| Company brief, fit matrix, day-of plan | [`README.md`](README.md) |

← Back to the [Caylent kit](README.md) · [Career Acceleration Kit](../README.md)
