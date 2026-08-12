# 04 — Python & FastAPI

> You claim Python as a *second* backend language, so the bar is different: nobody expects
> CPython internals, but they will check that you know why you reached for Python at all and
> that you understand the GIL. The best answer to almost everything here is "I use Python
> where the ecosystem wins — data, ML, quant — and Node where the concurrency model wins."
>
> 🔥 = genuinely hard / commonly fumbled.

---

## Python core

**Q. 🔥 What is the GIL and what does it actually stop you doing?**

> The Global Interpreter Lock means only one thread executes Python bytecode at a time in a
> CPython process. So threads give you **no speedup for CPU-bound work** — they just take
> turns. What it does *not* block is I/O: the lock is released around blocking calls, so
> threads are perfectly good for I/O-bound concurrency. For CPU-bound parallelism you need
> `multiprocessing` (separate interpreters, separate GILs) or a library that drops into C and
> releases the GIL — NumPy, pandas and scikit-learn all do this, which is why numeric Python
> is fast despite the GIL.

↳ **If pushed:** Python 3.13 ships an experimental free-threaded (no-GIL) build behind a flag —
  worth knowing it exists, but it's not the default and ecosystem support is partial.

---

**Q. `asyncio` vs threads vs multiprocessing — how do you choose?**

| Workload | Tool | Why |
|---|---|---|
| Many concurrent network calls | `asyncio` | Thousands of tasks on one thread, no thread overhead, cooperative scheduling. |
| Blocking I/O in libraries with no async support | threads | The GIL releases during the blocking call; simplest retrofit. |
| CPU-bound (parsing, maths, image work) | `multiprocessing` | Separate processes escape the GIL. |

> The failure mode I watch for is a blocking call inside async code — one synchronous
> `requests.get` or a heavy pandas operation inside a coroutine stalls the entire event loop.
> If it must be called, wrap it in `asyncio.to_thread` / `run_in_executor`.

---

**Q. Generators vs list comprehensions?**

> A list comprehension builds the whole list in memory. A generator expression yields items
> one at a time, holding one at a time. For a large file or query result that's the difference
> between constant memory and out-of-memory. The tradeoff: a generator is single-pass and has
> no length, so if you need to iterate twice or index, materialise it.

---

**Q. What is a decorator?**

> A callable that takes a function and returns a replacement, applied with `@`. It's how you
> add cross-cutting behaviour — timing, retries, caching, auth checks — without touching the
> function body. Two details worth mentioning: use `functools.wraps` so the wrapper keeps the
> original's name and docstring, and remember the decorator runs at import time while the
> wrapper runs per call.

```python
def retry(times: int):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except Exception:
                    if attempt == times - 1:
                        raise
        return wrapper
    return decorator
```

---

**Q. What's a context manager?**

> An object with `__enter__`/`__exit__` used via `with`, guaranteeing cleanup even if the block
> raises — files, database connections, locks, transactions. `contextlib.contextmanager` lets
> you write one as a generator with a single `yield`, which is how I'd write a "start a
> transaction, commit on success, roll back on exception" helper.

---

**Q. 🔥 What's wrong with this function?**

```python
def add_item(item, items=[]):
    items.append(item)
    return items
```

> The default argument is evaluated **once, at function definition**, so every call without an
> explicit list shares the same list and it grows forever. The fix is `items=None` and
> `items = items or []` inside. It's the classic Python gotcha and it applies to any mutable
> default — dicts and sets too.

---

**Q. Shallow vs deep copy in Python?**

> `copy.copy` copies the top-level container; nested objects are still shared. `copy.deepcopy`
> recursively copies everything and handles cycles. Slicing a list (`x[:]`) is a shallow copy.
> The bug this causes: copying a config dict, mutating a nested value, and being surprised the
> original changed too.

---

**Q. `is` vs `==`?**

> `==` compares value via `__eq__`; `is` compares identity — the same object in memory. Use
> `is` only for singletons: `is None`, `is True`. Small integers and short strings are interned
> by CPython, so `a is b` sometimes appears to work for values, which makes it a very
> convincing bug when the values get bigger.

---

**Q. `list` vs `tuple` vs `set` vs `dict`?**

> List: ordered, mutable, O(n) membership. Tuple: ordered, immutable, hashable so it can be a
> dict key. Set: unordered, unique, O(1) membership — the right choice for dedup and "have I
> seen this". Dict: key→value, O(1) lookup, insertion-ordered since 3.7. The performance answer
> interviewers want: if you're doing `x in some_list` inside a loop, that's O(n²) — make it a
> set.

---

**Q. How do type hints work — are they enforced?**

> Not at runtime by the interpreter; they're annotations, checked by an external tool like
> mypy or pyright. The exception is a library that reads them deliberately — Pydantic and
> FastAPI use them to drive real validation and coercion at runtime, which is exactly why
> FastAPI feels so tidy. I run mypy in CI, because a hint nobody checks is a comment.

---

**Q. Dataclass vs Pydantic model vs plain class?**

> `@dataclass` removes boilerplate (`__init__`, `__repr__`, `__eq__`) but does no validation —
> annotate a field `int` and pass a string and it happily stores the string. A Pydantic model
> validates and coerces at construction, which is what you want at any trust boundary: API
> payloads, config, external responses. Internal value objects with no external input can stay
> dataclasses (and `slots=True` if you're allocating a lot of them).

---

**Q. How does Python manage memory?**

> Reference counting as the primary mechanism — an object is freed the moment its refcount hits
> zero — plus a generational cycle collector for reference cycles that refcounting can't
> reclaim. Practical consequences: cycles involving objects with `__del__` used to be
> problematic (fixed since 3.4), and a global list or module-level cache that keeps growing is
> a leak in every language, Python included.

---

**Q. `*args` and `**kwargs`?**

> `*args` collects extra positional arguments into a tuple, `**kwargs` extra keyword arguments
> into a dict. Mostly used in wrappers and decorators that must forward an arbitrary signature
> through untouched. On the call side the same syntax unpacks a sequence or mapping into
> arguments.

---

## FastAPI

**Q. Why FastAPI over Flask or Django?**

> Native async, so it handles concurrent I/O-bound requests properly on an ASGI server rather
> than a thread per request; Pydantic-based validation driven by ordinary type hints, so the
> function signature is the contract; and OpenAPI docs generated from that same signature for
> free. Django is the better answer when you want the batteries — ORM, admin, auth — as one
> opinionated package. Flask is fine for something small and synchronous. For a typed JSON API
> in front of ML or data code, FastAPI is the least friction.

🔗 *Yours:* the SmartTrader quant engine and crypto-ai are FastAPI services behind a NestJS
API — Python for pandas/scikit-learn, Node for the product surface.

---

**Q. 🔥 `async def` vs `def` in a FastAPI route — what actually happens?**

> An `async def` route runs directly on the event loop. A plain `def` route is run in an
> external threadpool so it can't block the loop. That gives a counter-intuitive rule:
>
> - Async library available → `async def`.
> - Only a blocking library available → plain `def` is *correct* — let FastAPI put it on the
>   threadpool.
> - The dangerous case is `async def` containing a blocking call. That freezes the entire
>   event loop for every concurrent request, and it's the single most common FastAPI
>   performance bug.

---

**Q. How does Pydantic validation work?**

> You declare a model with typed fields; on construction Pydantic validates and coerces, and
> raises a structured `ValidationError` listing every failure with its location. In FastAPI,
> declaring a model as a parameter type means the request body is parsed, validated, and turned
> into a typed object before your code runs, and a failure becomes a 422 with details
> automatically. Pydantic v2 rewrote the core in Rust and is substantially faster; v2 renamed a
> lot of the API (`model_validate`, `model_dump`, `field_validator`), so I'd say which version
> I'm on.

---

**Q. Explain FastAPI's dependency injection.**

> `Depends(...)` declares that a parameter is produced by another callable, which can itself
> have dependencies — so you compose things like "get a DB session", "get the current user",
> "require this permission" and reuse them across routes. Dependencies can be generators, so a
> DB session dependency yields the session and closes it after the response, and results are
> cached per request so a dependency shared by three others runs once. It's the cleanest way to
> keep auth and resource lifecycle out of handler bodies.

```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    ...

@app.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user
```

---

**Q. What are response models and why use them?**

> `response_model=` declares the shape going out, and FastAPI filters the response to exactly
> those fields. That's a security control, not just documentation — it's what stops a
> `password_hash` or an internal flag leaking because someone returned the ORM object
> directly. Separate input and output models: the create model has fields the client sends,
> the read model has fields the client is allowed to see.

---

**Q. Background tasks vs a real queue?**

> `BackgroundTasks` runs after the response, in the same process. Fine for fire-and-forget
> work that's cheap and where losing it on a restart is acceptable — sending a notification,
> writing an audit log. It is not durable, not retried, and not observable. Anything that must
> complete, or takes real time, belongs in Celery/RQ/Arq, or in my case usually a queue in the
> Node service that already owns the workflow.

---

**Q. How do you deploy a FastAPI app?**

> Uvicorn as the ASGI server, usually managed by Gunicorn with uvicorn workers, one worker per
> core or so — measured, not assumed. Behind Nginx for TLS, static files and rate limiting.
> Containerised, with a health endpoint for readiness. The thing to watch is that each worker is
> a separate process with its own memory and its own connection pool, so pool sizes multiply by
> worker count and can exhaust Postgres connections.

---

**Q. How do you handle errors in FastAPI?**

> `HTTPException` for expected error paths with the right status code, a custom exception
> handler for your domain exceptions so the error envelope is consistent with the rest of the
> platform, and a catch-all handler that logs with a request ID and returns a generic 500 —
> never the traceback. Validation errors are already handled: Pydantic produces a 422 with a
> per-field breakdown.

---

**Q. Middleware in FastAPI?**

> ASGI middleware wrapping every request — I use it for request logging with a correlation ID,
> timing headers, and CORS (via the built-in `CORSMiddleware`). It runs outside the dependency
> system, so anything needing a DB session or the current user belongs in a dependency instead.

---

**Q. How do you test a FastAPI app?**

> `TestClient` (or `httpx.AsyncClient` for async tests) against the app object — no network
> needed. The key technique is `app.dependency_overrides`, which swaps a dependency for a test
> double, so I can point the DB dependency at a test database or stub the current user without
> touching application code. Same philosophy as everywhere else: cover the expensive-to-be-wrong
> paths properly, don't chase a coverage percentage.

---

**Q. When would you choose Python over Node for a service?**

> When the ecosystem decides it. Anything touching data science, ML, numerical work or
> scientific libraries — pandas, NumPy, scikit-learn, PyTorch — has no real Node equivalent, and
> reimplementing it would be a bad trade. Node wins for high-concurrency I/O services, and for
> sharing types and code with a TypeScript frontend. In my trading work I run both: a Python
> engine for strategy and model code, a Node API for the product, talking over HTTP.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| GIL, one line | One thread runs Python bytecode at a time; I/O releases it, CPU work doesn't. |
| `__init__` vs `__new__` | `__new__` creates the instance, `__init__` initialises it. |
| List comprehension | `[f(x) for x in xs if cond(x)]` — concise map+filter. |
| Lambda | A single-expression anonymous function. |
| `@staticmethod` vs `@classmethod` | No implicit first arg vs receives the class as `cls`. |
| Duck typing | Behaviour matters, not declared type — "if it quacks". |
| MRO | Method resolution order for multiple inheritance, computed by C3 linearisation. |
| `f-string` | Inline interpolation, `f"{x=}"` prints name and value — great for debugging. |
| `pathlib` over `os.path` | Object-oriented, cross-platform path handling. |
| Virtualenv | Per-project isolated dependency tree (`venv`, or uv/poetry for management). |
| PEP 8 | The style guide — enforce with ruff/black rather than argue about it. |
| `walrus` `:=` | Assign inside an expression, e.g. in a `while` condition. |
| ASGI vs WSGI | Async-capable server interface vs the older synchronous one. |
| `__slots__` | Fixes the attribute set, cutting per-instance memory. |

---

## Back to [INDEX.md](INDEX.md)
