# 02: FastAPI, Pydantic, SQLAlchemy (the AI backend)

> **JD lines covered:** "Python … FastAPI, Django" · "Pydantic, SQLAlchemy" · "High-performance
> backend architecture … FastAPI and AsyncIO" · "designing data structures and APIs" · "REST APIs".
>
> **Your frame of reference:** FastAPI is to Python what NestJS/Fastify is to Node. Pydantic is
> Zod. SQLAlchemy is Prisma/Drizzle with more control. Alembic is `drizzle-kit`/`prisma migrate`.

---

## 🟢 Level 1: Basics

### 1.1 Why FastAPI for AI backends

- **Async-native**, which suits I/O-heavy LLM calls (see [01 §3](01-python-for-ai-backends.md)).
- **Pydantic validation built in**: request bodies are validated from type hints.
- **Auto OpenAPI docs** at `/docs`. Your React frontend can generate a typed client from it.
- Streaming responses (SSE) are simple, and you need them for token streaming.
- The Python AI ecosystem (LangChain, LangGraph, the SDKs) is Python-first.

**Django** is "batteries included" (ORM, admin, auth, migrations). Pick it for CRUD-heavy
products with an admin panel. Pick FastAPI for API-first, async, AI-heavy services. Both JDs accept
either. Know when you'd pick which.

### 1.2 Smallest useful app

```python
# app/main.py
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(title="Notes API")

class NoteIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = ""

class NoteOut(NoteIn):
    id: int

DB: dict[int, NoteOut] = {}

@app.post("/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(note: NoteIn) -> NoteOut:          # body parsed + validated from type
    new = NoteOut(id=len(DB) + 1, **note.model_dump())
    DB[new.id] = new
    return new

@app.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(note_id: int) -> NoteOut:              # path param, auto-converted to int
    if note_id not in DB:
        raise HTTPException(status_code=404, detail="Note not found")
    return DB[note_id]
```

Run it with `uv run fastapi dev app/main.py` (or `uvicorn app.main:app --reload`) and open
`http://localhost:8000/docs`.

Where parameters come from:

| Declared as | Comes from |
|---|---|
| `note_id: int` that matches `{note_id}` in the path | path |
| `q: str \| None = None` (simple type, not in path) | query string `?q=` |
| `note: NoteIn` (a Pydantic model) | JSON body |
| `x_tenant: str = Header()` | header |
| `file: UploadFile` | multipart form |

### 1.3 Pydantic v2 essentials

```python
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict, EmailStr
from datetime import datetime
from typing import Literal

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)  # reject unknown keys

    thread_id: str | None = None
    message: str = Field(min_length=1, max_length=8000)
    mode: Literal["chat", "research"] = "chat"
    top_k: int = Field(default=5, ge=1, le=50)

    @field_validator("message")
    @classmethod
    def no_null_bytes(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("invalid characters")
        return v

req = ChatRequest.model_validate({"message": "hi"})    # dict → model (raises ValidationError)
req.model_dump()                                        # model → dict
req.model_dump_json()                                   # model → JSON string
ChatRequest.model_json_schema()                         # → JSON Schema (used for LLM tool defs!)
```

That last line matters for AI work. **A Pydantic model is the source of truth for an LLM tool
schema or a structured output format.** One class validates the HTTP request, describes the tool
to the model, and validates what the model returns.

### 1.4 Status codes and errors

| Code | When |
|---|---|
| 200 / 201 / 204 | OK / created / no content |
| 400 | malformed request |
| 401 / 403 | not authenticated / authenticated but not allowed |
| 404 | not found |
| 409 | conflict (duplicate, version mismatch) |
| 422 | validation failed (FastAPI's default for a Pydantic error) |
| 429 | rate limited (include `Retry-After`) |
| 500 / 502 / 503 / 504 | your bug / upstream bad / unavailable / upstream timeout. An LLM provider timeout surfaces as **504** or a graceful fallback, not 500 |

---

## 🟡 Level 2: Intermediate (a real service layout)

### 2.1 Project structure

```
app/
  main.py            # create_app(), lifespan, routers, middleware
  core/config.py     # Settings (pydantic-settings)
  core/security.py   # JWT, password hashing
  db/session.py      # engine, async_sessionmaker, get_db dependency
  db/models.py       # SQLAlchemy ORM models
  schemas/           # Pydantic request/response models (API contract)
  api/routes/        # thin route handlers
  services/          # business logic (pure-ish, testable)
  agents/            # LangGraph graphs, tools, prompts
  workers/           # background jobs
tests/
alembic/
```

Rule: **routes stay thin** (parse → call service → return). Logic lives in `services/`, so it's
testable without HTTP.

### 2.2 Settings from the environment

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    anthropic_api_key: SecretStr          # SecretStr: never printed in logs/reprs
    openai_api_key: SecretStr | None = None
    cors_origins: list[str] = ["http://localhost:3000"]
    llm_timeout_s: float = 60

@lru_cache
def get_settings() -> Settings:
    return Settings()                     # fails fast at startup if a required var is missing
```

### 2.3 Dependency injection with `Depends`

DI is how FastAPI gives each request a DB session, the current user, settings and so on. You can
also **override a dependency in tests**, and that's the main reason to use it.

```python
from fastapi import Depends
from typing import Annotated

async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session                       # code after yield = teardown

async def get_current_user(token: str = Depends(oauth2_scheme),
                           db: AsyncSession = Depends(get_db)) -> User:
    ...

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/threads")
async def list_threads(db: DB, user: CurrentUser):
    return await thread_service.list_for_user(db, user.id)
```

Dependencies are cached per request: if two dependencies both need `get_db`, they get the same
session.

### 2.4 SQLAlchemy 2.0 (async): models

```python
# app/db/models.py
from datetime import datetime
from sqlalchemy import ForeignKey, String, Text, func, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase): ...

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    threads: Mapped[list["Thread"]] = relationship(back_populates="user")

class Thread(Base):
    __tablename__ = "threads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)   # uuid
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    user: Mapped[User] = relationship(back_populates="threads")
    messages: Mapped[list["Message"]] = relationship(back_populates="thread",
                                                     order_by="Message.id",
                                                     cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("threads.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    tokens_in: Mapped[int] = mapped_column(default=0)
    tokens_out: Mapped[int] = mapped_column(default=0)
    thread: Mapped[Thread] = relationship(back_populates="messages")
    __table_args__ = (Index("ix_messages_thread_id_id", "thread_id", "id"),)
```

### 2.5 Session + queries

```python
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
engine = create_async_engine(settings.database_url,     # postgresql+asyncpg://...
                             pool_size=10, max_overflow=20, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def get_thread(db: AsyncSession, thread_id: str, user_id: int) -> Thread | None:
    stmt = (select(Thread)
            .where(Thread.id == thread_id, Thread.user_id == user_id)   # tenant isolation!
            .options(selectinload(Thread.messages)))                    # avoid N+1
    return (await db.execute(stmt)).scalar_one_or_none()

async def add_message(db: AsyncSession, thread_id: str, role: str, content: str) -> Message:
    msg = Message(thread_id=thread_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg
```

> ⚠️ **Lazy loading doesn't work in async SQLAlchemy.** Touching `thread.messages` without
> `selectinload` raises `MissingGreenlet`. Always eager-load the relationships you'll read.

### 2.6 Alembic migrations

```bash
uv add alembic && alembic init -t async alembic
# alembic/env.py → target_metadata = Base.metadata ; URL from settings
alembic revision --autogenerate -m "create threads and messages"
alembic upgrade head           # apply
alembic downgrade -1           # roll back one
```

**Always read the autogenerated migration** before applying it. Autogenerate misses renames
(it sees drop + add, which loses data) and some index/enum changes. In production, run migrations
as a separate deploy step, not on app start.

### 2.7 Auth (JWT) in brief

```python
from fastapi.security import OAuth2PasswordBearer
import jwt  # PyJWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def create_token(sub: str) -> str:
    return jwt.encode({"sub": sub, "exp": datetime.utcnow() + timedelta(hours=1)},
                      settings.jwt_secret.get_secret_value(), algorithm="HS256")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DB) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})
    user = await db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(401, "Invalid token")
    return user
```

Hash passwords with `argon2`/`bcrypt` (via `pwdlib` or `passlib`). In real products, using an
identity provider (Auth0, Cognito, Entra ID, Clerk) is usually the right call.

### 2.8 Middleware, CORS, request IDs

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def request_id(request, call_next):
    rid = request.headers.get("x-request-id") or uuid4().hex
    response = await call_next(request)
    response.headers["x-request-id"] = rid   # propagate to logs and traces
    return response
```

---

## 🔴 Level 3: Advanced (AI-specific backend patterns)

### 3.1 Lifespan: create expensive clients once

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=30)
    app.state.llm = AsyncAnthropic()
    app.state.graph = await build_graph()          # LangGraph compiled with a Postgres checkpointer
    yield
    await app.state.http.aclose()
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

### 3.2 Streaming tokens to the browser (SSE)

**Server-Sent Events** are one-way server → client over plain HTTP. They're the standard for
streaming LLM output. The format is lines of `data: ...\n\n`.

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, user: CurrentUser, request: Request):
    async def events():
        try:
            async with request.app.state.llm.messages.stream(
                model="claude-sonnet-5-5", max_tokens=4096,
                messages=[{"role": "user", "content": req.message}],
            ) as stream:
                async for text in stream.text_stream:
                    if await request.is_disconnected():          # user closed the tab
                        break
                    yield f"event: token\ndata: {json.dumps({'t': text})}\n\n"
                final = await stream.get_final_message()
            yield f"event: done\ndata: {json.dumps({'usage': final.usage.model_dump()})}\n\n"
        except Exception:
            log.exception("stream failed")
            yield f"event: error\ndata: {json.dumps({'message': 'generation failed'})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})   # stop nginx buffering
```

Interview points: send **typed events** (`token`, `tool_call`, `citation`, `done`, `error`) and not
just text. Disable proxy buffering. Handle disconnects so you stop paying for tokens nobody reads.
Send a heartbeat comment (`: ping\n\n`) every ~15 s so load balancers don't kill idle
connections. [genai/06](../genai/06-streaming-api-mechanics.md) has the deep version.

SSE vs WebSocket: SSE for one-way token streams (simpler, works through HTTP infrastructure,
auto-reconnect). WebSocket for genuinely two-way realtime (voice, collaborative editing, live
cancel plus steering).

### 3.3 Long jobs: don't do them inside the request

Ingesting 500 PDFs or a 10-minute research agent run shouldn't happen inside an HTTP request.

| Option | Use when |
|---|---|
| `BackgroundTasks` (FastAPI) | Tiny fire-and-forget (send an email). Lost if the process dies |
| **Celery** + Redis/RabbitMQ | Mature, retries, scheduling, monitoring (Flower). Sync-first |
| **arq** / **RQ** / **Dramatiq** | Lighter. arq is async-native |
| **Temporal** / LangGraph durable execution | Long, multi-step, must survive crashes and resume |

The API pattern: `POST /jobs` → `202 Accepted {job_id}` → the worker processes it → the client
polls `GET /jobs/{id}` or subscribes to SSE progress. Store job status in Postgres.

Make jobs **idempotent** (safe to run twice) with an idempotency key, because queues deliver *at
least once*. Your pSEO engine does exactly this with pg-boss (one job per dataset row,
re-queue on `ChainExhaustedError`). See [projects/07](projects/07-pseo-engine.md).

### 3.4 Rate limiting and quotas

- Per-user request limits: `slowapi` or a Redis token bucket at the gateway.
- **Per-tenant token budgets** matter more for AI. Record tokens on every call and reject or
  queue when a tenant is over budget.
- Return `429` with `Retry-After`.

### 3.5 Performance checklist

- One shared `httpx.AsyncClient` / SDK client (connection pooling).
- DB pool sized against Postgres `max_connections` ÷ number of workers.
- `uvicorn --workers N` or gunicorn with `uvicorn.workers.UvicornWorker`; N ≈ cores.
- Cache embeddings and deterministic LLM calls keyed by a hash of (model, prompt).
- Use **orjson** responses for large payloads (`ORJSONResponse`).
- Profile with `py-spy` before guessing.

### 3.6 Django in 10 lines (for the JD's "or Django")

```
django-admin startproject core . && python manage.py startapp chat
models.py   → class Thread(models.Model): user = models.ForeignKey(User, on_delete=models.CASCADE)
python manage.py makemigrations && python manage.py migrate
admin.py    → admin.site.register(Thread)   # free admin UI
DRF (Django REST Framework) → Serializers (≈ Pydantic) + ViewSets (≈ routers)
Async: Django supports async views; ORM async is partial → heavy AI paths often go to a FastAPI sidecar
```

---

## 🔧 Integration recipe: FastAPI + LangGraph agent endpoint

This is the shape you'll build in the [capstone](13-capstone-build-plan.md). The graph itself is
explained in [06](06-agents-langchain-langgraph.md).

```python
# app/api/routes/agent.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import json

router = APIRouter(prefix="/agent", tags=["agent"])

@router.post("/runs/stream")
async def run_stream(req: ChatRequest, user: CurrentUser, request: Request):
    graph = request.app.state.graph
    config = {"configurable": {"thread_id": req.thread_id, "user_id": str(user.id)}}

    async def events():
        async for mode, chunk in graph.astream(
            {"messages": [("user", req.message)]}, config, stream_mode=["messages", "updates"]
        ):
            if mode == "messages":                      # token-level stream from the LLM node
                msg, meta = chunk
                if msg.content:
                    yield f"event: token\ndata: {json.dumps({'t': msg.content, 'node': meta['langgraph_node']})}\n\n"
            elif mode == "updates":                     # a node finished → progress event
                for node, update in chunk.items():
                    if node == "__interrupt__":         # human approval needed
                        yield f"event: approval\ndata: {json.dumps(update[0].value)}\n\n"
                    else:
                        yield f"event: step\ndata: {json.dumps({'node': node})}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| FastAPI + Pydantic + Postgres + async | AI-observability-engine | [projects/01](projects/01-ai-observability-engine.md) |
| API-key auth, RBAC, admin API | AI-observability-engine | [projects/01](projects/01-ai-observability-engine.md) |
| Background job queue, idempotency, re-queue | pSEO (pg-boss), AgentSystem (BullMQ) | [projects/07](projects/07-pseo-engine.md), [projects/04](projects/04-agent-system.md) |
| Graceful degradation (AI route never 500s) | pSEO | [projects/07](projects/07-pseo-engine.md) |
| Python API depth Q&A | interview kit | [interview-qa/04](../interview-qa/04-python-fastapi.md) |

## ✅ Self-check

1. Where does FastAPI get each parameter from (path, query, body, header)?
2. Write a Pydantic model with a bounded int, a `Literal`, and a custom validator.
3. Why use `Depends` for the DB session instead of a global? How do you override it in a test?
4. What's N+1? How do you prevent it in async SQLAlchemy?
5. Walk through creating and applying an Alembic migration. What does autogenerate miss?
6. Write an SSE endpoint. What three production problems do you handle?
7. A research agent takes 6 minutes. Design the API.
8. FastAPI or Django for an internal admin-heavy CRUD tool? For an agent API?

## ⚠️ Traps

- Sync SQLAlchemy/`requests` inside `async def` blocks the loop. Either use async drivers or make the route `def` (FastAPI runs sync routes in a threadpool).
- Returning ORM objects straight from routes leaks columns. Use a `response_model`.
- Forgetting tenant filters (`user_id ==`) in every query. That's the #1 data-leak bug.
- Running `alembic upgrade` automatically on every container start with multiple replicas means racing migrations.
