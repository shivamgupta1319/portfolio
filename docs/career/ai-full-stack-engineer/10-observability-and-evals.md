# 10: Observability and Evaluation (LangSmith, Arize Phoenix, OpenTelemetry)

> **JD lines covered:** "Implement rigorous LLM/Agent evaluation frameworks (Latency, Cost,
> Accuracy) using tools like Arize AI and LangSmith" · "Monitor application performance,
> troubleshoot issues" · "The Perfectionist: observability, evaluation metrics".
>
> **Your position:** you understand this deeper than most candidates, because you *built* a tracing
> product (AI-observability-engine) and a labelled eval harness with an honest negative result
> (repo-intelligence). What's missing is hands-on time with the **named tools**. Two evenings of
> work closes that. Theory depth: [genai/04](../genai/04-evals.md), [genai/08](../genai/08-llmops.md).

---

## 🟢 Level 1: Basics

### 1.1 Why AI apps need different observability

A normal API is deterministic: same input, same output, and errors are exceptions. An LLM app can
return **HTTP 200 with a wrong answer**. So beyond logs, metrics and traces, you need to capture
*what the model saw and said* at every step, and *score* it.

| Pillar | Classic | AI-specific addition |
|---|---|---|
| Logs | Request logs, errors | Prompts, completions, tool args/results (redacted) |
| Metrics | RPS, error rate, p95 latency | **Tokens, cost, TTFT, tool-call counts, retrieval hit rate, % refusals / INSUFFICIENT_CONTEXT** |
| Traces | Span per service call | **Span per LLM call, retrieval, tool and graph node**, nested as a tree |
| Quality | — | **Evals**: offline on datasets, online on sampled production traffic, plus user feedback |

### 1.2 Anatomy of an agent trace

```
run: "Compare North vs South Q3"                     6.8 s   $0.031   8,940 tok
├─ supervisor (llm: haiku)                           0.6 s   $0.0004
├─ data_analyst
│  ├─ llm (sonnet) → tool_call run_sql               1.1 s
│  ├─ tool run_sql                                   0.4 s   rows=2
│  └─ llm (sonnet) → answer                          1.3 s
├─ researcher
│  ├─ retriever hybrid_search                        0.2 s   k=40
│  ├─ reranker                                       0.3 s   top=5
│  └─ llm (sonnet)                                   1.9 s
└─ writer (llm: sonnet)                              1.0 s
```

With this you can answer: *where did the time go, what did it cost, which step was wrong.*

### 1.3 The three metric families the JD names

| Family | Metrics |
|---|---|
| **Latency** | TTFT, total, per node/tool, p50/p95/p99, queue wait |
| **Cost** | tokens in/out/cached per call → $ per run, per user, per tenant, per feature. Cost per *successful* task |
| **Accuracy/quality** | Task success, correctness vs reference, faithfulness/groundedness, citation precision, retrieval recall@k/MRR, tool-selection accuracy, format validity, user 👍 rate |

---

## 🟡 Level 2: The tools, hands-on

### 2.1 LangSmith (LangChain's platform)

Tracing LangChain/LangGraph is just environment variables:

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=...
export LANGSMITH_PROJECT=insight-copilot-dev
```

Every `invoke` / graph run is then traced, with node-level spans, tokens, latency and cost. To trace your
own non-LangChain code:

```python
from langsmith import traceable

@traceable(run_type="retriever", name="hybrid_search")
async def hybrid_search(tenant_id: str, query: str) -> list[dict]: ...

@traceable(run_type="tool")
def compute_growth(a: float, b: float) -> float: ...
```

Add metadata/tags for filtering: `config={"metadata": {"tenant": tid, "graph_version": "v7"}, "tags": ["prod"]}`.

**Offline evaluation with a dataset:**

```python
from langsmith import Client, evaluate
client = Client()

ds = client.create_dataset("roadmap-qa-v1")
client.create_examples(dataset_id=ds.id, examples=[
    {"inputs": {"question": "What drove Q3 churn?"},
     "outputs": {"answer": "Pricing change in July", "must_cite": ["q3-report.pdf"]}},
    # ... 30–100 examples covering easy, hard, adversarial, no-answer cases
])

def target(inputs: dict) -> dict:
    out = graph.invoke({"messages": [("user", inputs["question"])]},
                       {"configurable": {"thread_id": str(uuid4())}})
    return {"answer": out["messages"][-1].content}

def cites_required_sources(run, example) -> dict:          # code-based evaluator
    ans = run.outputs["answer"]
    ok = all(src in ans for src in example.outputs["must_cite"])
    return {"key": "citation_recall", "score": int(ok)}

def correctness(run, example) -> dict:                     # LLM-as-judge evaluator
    verdict = judge.invoke(JUDGE_PROMPT.format(q=example.inputs["question"],
                                               ref=example.outputs["answer"],
                                               ans=run.outputs["answer"]))
    return {"key": "correctness", "score": verdict.score}  # structured output 0/1

results = evaluate(target, data="roadmap-qa-v1",
                   evaluators=[cites_required_sources, correctness],
                   experiment_prefix="graph-v7", max_concurrency=4)
```

Then compare experiments side by side (v6 vs v7) in the UI. Use **annotation queues** for human
review of sampled production traces, and **online evaluators** that score live traffic.

### 2.2 Arize Phoenix (open source, OpenTelemetry-based)

Phoenix uses **OpenInference** (OTel semantic conventions for LLMs), so it's vendor-neutral.

```python
# pip install arize-phoenix openinference-instrumentation-langchain
import phoenix as px
from phoenix.otel import register
from openinference.instrumentation.langchain import LangChainInstrumentor

px.launch_app()                                   # local UI at :6006 (or run the Phoenix container)
tracer_provider = register(project_name="insight-copilot")
LangChainInstrumentor().instrument(tracer_provider=tracer_provider)
# also: OpenAIInstrumentor, AnthropicInstrumentor, LlamaIndexInstrumentor...
```

Phoenix gives you traces, **evals** (built-in LLM-judge templates for hallucination, QA
correctness, relevance and toxicity), datasets and experiments, and embedding drift visualizations.
Arize AX is the commercial platform built on the same model.

**Langfuse** is the other popular open-source option (self-hostable, tracing + prompt management +
evals). Your AI-observability-engine is in the same product category.

### 2.3 OpenTelemetry (the vendor-neutral foundation)

```python
from opentelemetry import trace
tracer = trace.get_tracer("insight-copilot")

async def retrieve(q):
    with tracer.start_as_current_span("retrieve") as span:
        span.set_attribute("retrieval.k", 40)
        hits = await hybrid_search(q)
        span.set_attribute("retrieval.hits", len(hits))
        return hits
```

OTel lets the same traces flow to Phoenix, Datadog, Grafana Tempo, Honeycomb and others. The **GenAI
semantic conventions** (`gen_ai.request.model`, `gen_ai.usage.input_tokens`, …) standardize LLM
attributes. Propagate the trace context from the frontend request ID through FastAPI to the graph.

### 2.4 Classic production monitoring still applies

- **Metrics:** Prometheus + Grafana (`prometheus-fastapi-instrumentator`), or the cloud's native
  stack (CloudWatch, Azure Monitor).
- **Errors:** Sentry for exceptions in both React and FastAPI.
- **Structured JSON logs** with `request_id`, `trace_id`, `tenant_id` and `run_id`.
- **Alerts:** error rate, p95 latency, **cost per hour above budget**, provider 429 rate, eval score drop,
  and queue backlog.

---

## 🔴 Level 3: Advanced (evaluation as an engineering discipline)

### 3.1 Building a good eval dataset

1. **Start from real usage**: production questions, support tickets, stakeholder examples.
2. **Cover categories**: easy, hard multi-hop, ambiguous, no-answer (should say INSUFFICIENT_CONTEXT),
   adversarial/injection, and multilingual if relevant.
3. **Label what you can check**: reference answer, required sources/chunk IDs, expected tool calls,
   and forbidden content.
4. **Split**: a dev set you iterate on and a held-out test set you rarely look at, so you don't overfit
   prompts to the set.
5. **Grow it from failures**: every production bug becomes a new example (a regression test).

Size: 30–50 examples to start catch most regressions. Grow to hundreds for fine-grained comparisons.
Report a **confidence caveat** when the set is small. Your repo-intelligence HANDOFF does this
honestly: its held-out numbers rest on 2 questions ([projects/03](projects/03-repo-intelligence.md)).

### 3.2 Evaluator types: cheapest and most reliable first

| Evaluator | Example | Reliability |
|---|---|---|
| **Deterministic code** | Valid JSON? Schema? Cited IDs exist? Called `run_sql` before answering a number? Under budget? | Highest. Use as much as possible |
| **Reference-based** | Exact/F1 match, numeric tolerance, retrieval recall@k against labelled chunk IDs | High |
| **LLM-as-judge** | Correctness vs reference, faithfulness to context, helpfulness | Medium. **Calibrate it** |
| **Pairwise judge** | "Is A or B better?" for comparing versions | Better than absolute scores for small deltas |
| **Human** | Annotation queue, expert review | Gold standard, expensive |

**LLM-judge hygiene:** binary or small-scale rubrics (pass/fail with a reason), not 1–10. A judge
model at least as strong as the one being judged, ideally from a different family. Randomize order in
pairwise comparisons (position bias). Watch for verbosity bias. **Measure judge agreement with
human labels** on 30–50 items before trusting it.

### 3.3 Evaluating agents specifically

- **Final outcome**: was the task done and the answer correct?
- **Trajectory**: right tools, sensible order, no redundant loops (compare with a reference
  trajectory or use a judge on the step list).
- **Single-step**: given this state, did the router pick the right agent and did the tool get the right args?
  (These are cheap unit-style evals per node.)
- **Efficiency**: steps, tokens, cost and latency per successful task.
- **Safety**: did it ask for approval before irreversible actions? Did an injection in a document change
  its behaviour?

### 3.4 Evals in CI (the "security gate" for quality)

```yaml
# .github/workflows/evals.yml (runs when prompts/graph/retrieval change)
on:
  pull_request:
    paths: ["app/agents/**", "app/rag/**", "prompts/**"]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync
      - run: uv run python -m evals.run --dataset roadmap-qa-v1 --min-correctness 0.85 --min-citation 0.95
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
```

The script exits non-zero if any metric drops below its threshold **or regresses by more than X% versus main**.
Keep it cheap: a small fast set on PRs and the full set nightly.

### 3.5 Online evaluation and feedback loops

```
production traces ──sample 5%──▶ online evaluators (faithfulness, format) ──▶ dashboards + alerts
user 👍/👎 + comments ──────────▶ attached to the trace ──▶ low scores → annotation queue
annotated failures ─────────────▶ added to the eval dataset ──▶ next prompt/graph change is tested on them
```

That loop is what "rigorous evaluation framework" means in practice. Say it in those words.

### 3.6 Cost and latency optimization driven by data

Find the top cost nodes in traces, then apply cheaper-model routing, prompt caching, a smaller
context, fewer agent hops, or batch APIs for offline jobs. Re-run evals to prove quality held.
**Always report cost per *successful* task**, since a cheaper config that fails more isn't cheaper.

---

## 🔧 Integration recipe: minimal in-house eval runner

Use this when you don't have a platform, or for CI.

```python
# evals/run.py
import json, statistics, sys, asyncio, argparse

async def run_case(case):
    out = await graph.ainvoke({"messages": [("user", case["question"])]},
                              {"configurable": {"thread_id": f"eval-{case['id']}"}})
    answer = out["messages"][-1].content
    tools = [m.name for m in out["messages"] if m.type == "tool"]
    return {
        "id": case["id"],
        "citation": all(s in answer for s in case.get("must_cite", [])),
        "tool_ok": all(t in tools for t in case.get("must_call", [])),
        "abstain_ok": (("INSUFFICIENT_CONTEXT" in answer) == case.get("should_abstain", False)),
        "correct": (await judge_correct(case["question"], case.get("reference"), answer)) if case.get("reference") else None,
    }

async def main(path, min_correct, min_cite):
    cases = [json.loads(l) for l in open(path)]
    rs = await asyncio.gather(*(run_case(c) for c in cases))
    rate = lambda k: statistics.mean(r[k] for r in rs if r[k] is not None)
    report = {k: round(rate(k), 3) for k in ["citation", "tool_ok", "abstain_ok", "correct"]}
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["correct"] >= min_correct and report["citation"] >= min_cite else 1)
```

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| LLM tracing product: SDK `@observe`, OpenAI/Anthropic wrappers, ClickHouse traces | AI-observability-engine (with real bugs you should know about: cost never computed for SDK traffic) | [projects/01](projects/01-ai-observability-engine.md) |
| Labelled eval set, P/R/F1, MRR, three-arm ablation, honest negative result | repo-intelligence | [projects/03](projects/03-repo-intelligence.md) |
| Per-call logging of model calls | Resite AI service call log | [projects/08](projects/08-resite.md) |
| Eval/observability interview depth | genai kit | [genai/04](../genai/04-evals.md), [genai/08](../genai/08-llmops.md) |

**What you can say today:** "I've built LLM tracing from the SDK to ClickHouse, and I gate retrieval
changes on a labelled eval delta." **After the capstone:** "…and I run LangSmith experiments in CI
and Phoenix traces in dev, with an LLM-judge I calibrated against human labels."

## ✅ Self-check

1. Why isn't "HTTP 200 + low latency" enough monitoring for an LLM app?
2. Draw an agent trace tree. What do you read off it?
3. Turn on LangSmith tracing for a LangGraph app. How do you trace non-LangChain code?
4. Phoenix vs LangSmith vs Langfuse. What's OpenInference?
5. Design a 50-example eval set for a document Q&A agent.
6. How do you know your LLM judge is trustworthy?
7. What's a trajectory eval?
8. Write the CI gate. What thresholds, and how do you keep it cheap?
9. "Cost per successful task". Why that metric?

## ⚠️ Traps

- Only tracking averages. Track p95 and the tail.
- 1–10 judge scores with no calibration.
- Logging raw prompts that contain PII or secrets.
- An eval set you tune against until it's 100%, i.e. overfitting. Keep a held-out set.
