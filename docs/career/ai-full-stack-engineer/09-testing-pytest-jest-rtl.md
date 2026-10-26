# 09: Testing (PyTest, Jest, React Testing Library)

> **JD lines covered:** "end-to-end testing, including unit, integration, functional, and smoke
> testing" · "automated testing frameworks such as Py-Test and Jest" · "A Test-Driven mindset.
> Proficiency in PyTest, Jest, and React Testing Library".
>
> **Where you stand:** you have Vitest suites (Resite: 23 files, 178 cases, plus Playwright specs;
> Inbox Agent: 58 tests; repo-intelligence: 405 tests) and PyTest in AI-observability-engine.
> **Not present anywhere:** React Testing Library, Jest, and tests running in CI for most repos
> ([projects/09](projects/09-deployment-ci-testing-evidence.md)). Vitest's API is close to
> Jest's (`describe/it/expect/vi.fn` ≈ `jest.fn`), so mostly the habits transfer.

---

## 🟢 Level 1: Basics

### 1.1 The test types the JD lists

| Type | Question it answers | Scope | Speed | Example in an AI app |
|---|---|---|---|---|
| **Unit** | Does this function work in isolation? | One function/class, dependencies faked | ms | chunker splits correctly; RRF math; citation validator drops fake IDs |
| **Integration** | Do the pieces work together? | Real DB/queue, fake LLM | 100 ms–s | `POST /documents` stores chunks in a real Postgres; repository queries |
| **Functional** | Does the feature behave as the requirement says? | Through the API/UI, black-box | s | "Uploading a PDF then asking about it returns a cited answer" |
| **E2E** | Does the whole system work like a user sees it? | Browser + backend + DB | s–min | Playwright: log in → chat → approve the agent action |
| **Smoke** | Is the deployed thing alive and wired? | A few critical paths against a real env | s | After deploy: `/health` 200, login works, one cheap LLM call succeeds |
| **Contract** | Do frontend and backend agree on the API? | Schema | ms | OpenAPI-generated types, schema diff in CI |
| **Eval** (AI-specific) | Is the *quality* still good? | Datasets + scorers | min | Golden-set accuracy ≥ threshold ([10](10-observability-and-evals.md)) |

**Test pyramid:** many unit tests, fewer integration tests, few E2E tests. For AI apps, add an
**eval layer** beside the pyramid, because LLM output is non-deterministic and assert-equal tests
can't judge quality.

### 1.2 PyTest essentials

```python
# tests/test_chunker.py
import pytest
from app.rag.chunker import chunk_text

def test_short_text_is_one_chunk():
    assert chunk_text("hello", size=100) == ["hello"]

@pytest.mark.parametrize("size,overlap,expected", [(10, 0, 3), (10, 2, 4)])
def test_chunk_count(size, overlap, expected):
    assert len(chunk_text("x" * 25, size=size, overlap=overlap)) == expected

def test_rejects_bad_overlap():
    with pytest.raises(ValueError, match="overlap"):
        chunk_text("abc", size=10, overlap=10)
```

**Fixtures** are reusable setup, injected by argument name, with scopes `function` (default),
`module` and `session`:

```python
# tests/conftest.py   (fixtures here are available to every test file)
@pytest.fixture
def sample_docs():
    return [{"id": "a", "content": "refund policy is 30 days"},
            {"id": "b", "content": "shipping takes 5 days"}]

@pytest.fixture
def tmp_index(tmp_path):                 # tmp_path is a built-in fixture
    idx = Index(path=tmp_path / "idx")
    yield idx                            # teardown after yield
    idx.close()
```

Run: `pytest -q`, `pytest -k rrf`, `pytest -x` (stop at first failure), `pytest --lf` (last failed),
`pytest --cov=app --cov-report=term-missing`.

### 1.3 Jest / Vitest essentials

```ts
import { rrf } from "./fuse";
describe("rrf", () => {
  it("ranks a doc found by both lists first", () => {
    const fused = rrf([["a", "b"], ["c", "a"]], 60);
    expect(fused[0].id).toBe("a");
  });
  it("calls the logger on empty input", () => {
    const log = jest.fn();                       // vi.fn() in Vitest
    rrf([], 60, { log });
    expect(log).toHaveBeenCalledWith("empty input");
  });
});
```

---

## 🟡 Level 2: Testing a FastAPI + LLM backend

### 2.1 Async API tests with dependency overrides

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import get_db
from app.core.security import get_current_user

@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: User(id=1, email="t@example.com")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

# tests/test_threads_api.py
async def test_create_thread(client):
    r = await client.post("/threads", json={"title": "Q3 review"})
    assert r.status_code == 201
    assert r.json()["title"] == "Q3 review"

async def test_validation_error(client):
    r = await client.post("/chat", json={"message": ""})
    assert r.status_code == 422
```

Configure async tests with `pytest-asyncio` (`asyncio_mode = "auto"` in `pyproject.toml`) or `anyio`.

### 2.2 Real database in integration tests: testcontainers

```python
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def pg_url():
    with PostgresContainer("pgvector/pgvector:pg16") as pg:
        yield pg.get_connection_url().replace("psycopg2", "asyncpg")

@pytest.fixture
async def db_session(pg_url):
    engine = create_async_engine(pg_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as s:
        yield s
        await s.rollback()                      # isolate tests
    await engine.dispose()
```

A real Postgres catches what mocks hide: constraint violations, pgvector operators, JSONB queries
and migration errors.

### 2.3 Never call a real LLM in unit/integration tests

They're slow, cost money, are non-deterministic and flaky. Instead:

**(a) Fake the boundary with your own Protocol** ([04](04-llm-fundamentals-sdks-tool-calling.md)):
```python
class FakeLLM:
    def __init__(self, replies): self.replies, self.calls = list(replies), []
    async def complete(self, system, messages, max_tokens=1024):
        self.calls.append(messages)
        return LLMResult(self.replies.pop(0), "fake", 10, 5)

async def test_rag_answer_says_insufficient_when_no_hits():
    svc = RagService(db=..., embedder=FakeEmbedder(), reranker=lambda q, h, k: [], llm=FakeLLM([]))
    ans = await svc.answer("t1", "unknown question")
    assert ans.answer == "INSUFFICIENT_CONTEXT"
```

**(b) LangChain fake chat models:**
```python
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

fake = GenericFakeChatModel(messages=iter([
    AIMessage(content="", tool_calls=[{"name": "get_revenue", "args": {"region": "North", "quarter": "Q3 2026"}, "id": "1"}]),
    AIMessage(content="North revenue was ₹120 cr [1]."),
]))
```

**(c) Mock HTTP** at the transport layer with `respx` (httpx) to simulate 429s, timeouts and
malformed JSON:
```python
@respx.mock
async def test_fallback_on_429():
    respx.post("https://api.primary.example/v1/chat").mock(return_value=httpx.Response(429))
    respx.post("https://api.secondary.example/v1/chat").mock(return_value=httpx.Response(200, json=OK))
    assert (await router.complete("hi")).model == "secondary"
```

**(d) `unittest.mock.AsyncMock`** for quick one-offs: `mocker.patch("app.x.client.messages.create", new=AsyncMock(return_value=fake_msg))`.

### 2.4 What to unit-test in an AI system (the deterministic parts)

- Prompt building (snapshot the rendered prompt: the right sources, delimiters, instructions).
- Output parsing and validation (malformed JSON, missing fields, refusals, truncation).
- Tool functions themselves (they're normal code).
- Routing/conditional-edge functions in LangGraph (`should_revise(state)` returns the right node).
- Citation validation, chunking, RRF, budget trimming.
- Retry/fallback logic (via respx).
- Authorization: user A can't read user B's thread (**always test this**).

### 2.5 Testing LangGraph

```python
async def test_agent_calls_tool_then_answers():
    graph = build_graph(llm=fake, tools=[fake_get_revenue]).compile(checkpointer=InMemorySaver())
    out = await graph.ainvoke({"messages": [("user", "North Q3?")]},
                              {"configurable": {"thread_id": "t"}})
    tool_msgs = [m for m in out["messages"] if m.type == "tool"]
    assert len(tool_msgs) == 1 and "120" in tool_msgs[0].content
    assert "[1]" in out["messages"][-1].content

async def test_interrupt_pauses_before_send():
    cfg = {"configurable": {"thread_id": "t2"}}
    await graph.ainvoke({"messages": [("user", "email the CFO")]}, cfg)
    state = await graph.aget_state(cfg)
    assert state.next == ("send_email",)            # paused, not sent
    assert fake_gmail.sent == []
```

Test individual **nodes as plain functions** too: they take state and return a dict.

---

## 🟡 Level 2: React Testing Library

### 2.6 The philosophy

*"The more your tests resemble the way your software is used, the more confidence they give."*
Query by what users see (role, label, text), not by CSS classes or component internals. Interact
through `userEvent`, and assert on visible output.

Query priority: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId` (last resort).
`getBy*` throws if missing, `queryBy*` returns null (for asserting absence), and `findBy*` is async
(waits for it to appear).

### 2.7 Testing a chat component with a mocked API (MSW)

```tsx
// ChatPanel.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { ChatPanel } from "./ChatPanel";

const sse = (events: object[]) =>
  events.map((e) => `event: ${(e as any).type}\ndata: ${JSON.stringify(e)}\n\n`).join("");

const server = setupServer(
  http.post("/api/agent/runs/stream", () =>
    new HttpResponse(sse([
      { type: "tool_call", id: "1", name: "search_docs", args: {} },
      { type: "token", t: "Refunds take 30 days " },
      { type: "token", t: "[1]." },
      { type: "citation", n: 1, source: "policy.pdf", page: 4 },
      { type: "done" },
    ]), { headers: { "Content-Type": "text/event-stream" } })),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("streams an answer with a citation and a tool step", async () => {
  const user = userEvent.setup();
  render(<ChatPanel />);
  await user.type(screen.getByRole("textbox", { name: /message/i }), "refund policy?");
  await user.click(screen.getByRole("button", { name: /send/i }));

  expect(await screen.findByText(/refunds take 30 days/i)).toBeInTheDocument();
  expect(screen.getByText(/search_docs/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /policy\.pdf.*4/i })).toBeInTheDocument();
});

test("shows an error state with retry", async () => {
  server.use(http.post("/api/agent/runs/stream", () => new HttpResponse(null, { status: 500 })));
  const user = userEvent.setup();
  render(<ChatPanel />);
  await user.type(screen.getByRole("textbox", { name: /message/i }), "hi");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
});
```

### 2.8 Testing the HITL approval card

```tsx
test("approve posts the decision", async () => {
  const calls: unknown[] = [];
  server.use(http.post("/api/agent/runs/:id/resume", async ({ request }) => {
    calls.push(await request.json()); return HttpResponse.json({ ok: true });
  }));
  render(<ApprovalCard runId="r1" req={{ action: "send_email", payload: { to: "cfo@x.com" } }} />);
  await userEvent.click(screen.getByRole("button", { name: /approve/i }));
  expect(calls).toEqual([{ decision: "approve" }]);
});
```

Setup: Jest with `jest-environment-jsdom` + `@testing-library/jest-dom`, or Vitest with
`environment: "jsdom"`. In Next.js, test Client Components with RTL, test Server Components through
E2E, and keep data logic in plain functions you can unit-test.

---

## 🔴 Level 3: Advanced

### 3.1 E2E with Playwright

```ts
test("user uploads a doc and gets a cited answer", async ({ page }) => {
  await page.goto("/login"); await login(page);
  await page.getByRole("button", { name: "Upload" }).setInputFiles("fixtures/policy.pdf");
  await expect(page.getByText("Indexed")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("textbox", { name: "Message" }).fill("What is the refund window?");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/30 days/)).toBeVisible();
  await expect(page.getByRole("link", { name: /policy.pdf/ })).toBeVisible();
});
```

For E2E, point the backend at a **stub LLM server** (or record/replay) so the run is deterministic. Keep
one or two "real model" E2E tests in a nightly job.

### 3.2 Smoke tests after deploy

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE=${1:?base url}
curl -fsS "$BASE/health" | grep -q '"status":"ok"'
curl -fsS "$BASE/health/ready"                     # checks DB + vector DB + LLM key presence
curl -fsS -X POST "$BASE/smoke/llm" -H "x-smoke-token: $SMOKE_TOKEN"   # one tiny real call
echo "smoke OK"
```

Run it in CI right after deploy, and **roll back automatically** on failure ([11](11-devsecops-docker-k8s-cicd-cloud.md)).

### 3.3 TDD for AI features

The red → green → refactor cycle works for the deterministic shell around the model:
1. Write a failing test for the parser/validator/router/tool.
2. Implement it minimally.
3. Refactor.
4. For the *model behaviour*, write an **eval case** first (the input + expected property), see it fail,
   then change the prompt/graph until it passes without regressing the others. That's TDD for prompts.

### 3.4 Flaky tests and non-determinism

- Freeze time (`freezegun` / `jest.useFakeTimers`), seed randomness and fake UUIDs.
- Never assert exact LLM text. Assert **properties** (contains a citation, valid JSON, called tool X,
  under N tokens).
- Quarantine flaky tests, fix them, and never just add retries.

### 3.5 Coverage and CI gates

Coverage is a smell detector, not a goal: aim for ~80% on core logic, not 100% everywhere. Gate in CI:
unit + integration on every PR, E2E on main/nightly, evals on prompt/graph changes, smoke after
deploy.

---

## 🔧 Integration recipe: `pyproject.toml` + `package.json` test config

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-q --strict-markers --cov=app --cov-report=term-missing"
markers = ["integration: needs docker", "llm: calls a real model (nightly only)"]
```
`pytest -m "not llm"` on PRs, `pytest -m llm` nightly.

```json
{ "scripts": { "test": "jest", "test:e2e": "playwright test" },
  "jest": { "testEnvironment": "jsdom", "setupFilesAfterEach": ["<rootDir>/jest.setup.ts"] } }
```
(`jest.setup.ts`: `import "@testing-library/jest-dom";`. With Next.js, use `next/jest` to create the config.)

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| PyTest suite for a FastAPI service | AI-observability-engine | [projects/01](projects/01-ai-observability-engine.md) |
| Large Vitest suite, test doubles (`FakeEmbedder`) | repo-intelligence | [projects/03](projects/03-repo-intelligence.md) |
| Vitest + Playwright (desktop + 390 px phone) | Resite | [projects/08](projects/08-resite.md) |
| 58 Vitest tests on core logic | Inbox Agent | [projects/05](projects/05-inbox-agent.md) |
| Where tests do and don't run in CI | all repos | [projects/09](projects/09-deployment-ci-testing-evidence.md) |

## ✅ Self-check

1. Define unit, integration, functional, E2E, smoke. Give one AI-app example of each.
2. How do you test a FastAPI route without a real auth provider or DB?
3. Three ways to avoid real LLM calls in tests.
4. What do you unit-test in an agent if the LLM is non-deterministic?
5. RTL query priority and why. `getBy` vs `queryBy` vs `findBy`.
6. Test a streaming chat component. How do you mock SSE?
7. Write a post-deploy smoke test. What happens when it fails?
8. What's TDD for a prompt?

## ⚠️ Traps

- Asserting on exact LLM output strings.
- Mocking the thing you're testing (e.g. mocking the repository in a repository test).
- RTL tests that query `.className` or call component methods.
- Saying "we have tests" when they don't run in CI.
