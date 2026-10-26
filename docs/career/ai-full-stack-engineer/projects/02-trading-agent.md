# trading-agent — how your code actually works

**What it is, in plain English:** a chat assistant for Indian (NSE) stocks. You ask it
something like "is there a swing trade in BAJFINANCE, I have 2 lakh". An LLM reads your question
plus a menu of 7 Python functions ("tools"). It decides which ones to call, and your code runs
them: fetch prices from Yahoo, compute indicators, apply a strategy, size the position,
backtest. The results go back to the LLM, which can call more tools or write the final answer.
It runs in a terminal (`main.py`) or a Streamlit web page (`app.py`) with chart, scanner and
chat tabs. It is **read-only**: nothing in it can place a trade.

- **Path:** `~/workspace/trading-agent`
- **Stack:** Python 3.12 · `openai` SDK pointed at **OpenRouter** (an OpenAI-compatible gateway to
  Gemini/GPT/Llama…) · pandas/numpy · yfinance · Streamlit + Plotly · python-dotenv
  (`trading-agent/requirements.txt:1-7`)
- **Honest status:** a personal learning project. **2 commits, both on 2026-06-18**, about 2,050 lines
  of Python in 11 files. **There are no tests, no CI, no Dockerfile, and it has never been deployed.**
  It works locally. The code and README are written to teach ("Read it slowly", `trading-agent/agent.py:4`).
  I checked the agent loop offline with a fake LLM client: one tool call followed by a final
  answer gives the expected message sequence `system, user, assistant, tool, assistant`.

> Reading order if you have 15 minutes: `agent.py` (the whole loop is ~80 lines) →
> `tools.py:228-245` (dispatch table + start of schemas) → `app.py:242-305` (chat memory) →
> `backtest.py:47-102`.

---

## JD coverage

| JD requirement | Where in this code | Strength |
|---|---|---|
| Tool / function calling | 7 JSON-schema tools at `trading-agent/tools.py:245-443`, passed as `tools=TOOL_SCHEMAS` at `trading-agent/agent.py:126` | **Strong** |
| Agent loop (ReAct-style) | `run_conversation`, `trading-agent/agent.py:101-183` | **Strong** (hand-written, no framework) |
| LLM SDK / provider abstraction | `OpenAI(base_url="https://openrouter.ai/api/v1")` at `trading-agent/agent.py:89`; model from env at `trading-agent/app.py:30` | **Strong** for one provider. No fallback. |
| Prompt engineering / guardrails | 50-line system prompt with an intent→tool map and hard rules, `trading-agent/agent.py:28-77` | **Strong** (prompt-level only) |
| Conversation memory | Messages list in `st.session_state.convo`, `trading-agent/app.py:245-251`, `:269` | **Partial.** Short-term only, unbounded. |
| Streaming UX | `on_event` callback streams tool calls into `st.status`, `trading-agent/app.py:273-280` | **Partial.** Streams tool events, not tokens. |
| "Evals" | Backtesting as domain evidence: win-rate and expectancy, `trading-agent/backtest.py:105-133` | **Partial.** No LLM-output evals. |
| LangChain / LangGraph / MCP | none | **Not present** |
| RAG / vector DB | none | **Not present** |
| FastAPI / Pydantic / SQLAlchemy | none. Schemas are hand-written dicts, and no database. | **Not present** |
| AsyncIO | none. Everything is synchronous. | **Not present** |
| Observability (LangSmith/Arize) | only `print` (`trading-agent/agent.py:156-157`) and the UI callback | **Not present** |
| PyTest | zero test files | **Not present** |
| Docker / CI/CD | none | **Not present** |
| Frontend | Streamlit (Python), not React/Next.js | **Partial** |

The honest one-liner: **this is your cleanest "I understand the agent loop and tool calling from
first principles" artifact.** It isn't a backend-engineering artifact. Pair it with
AI-observability-engine for that.

---

## The big picture

```
  Streamlit app.py (or CLI main.py)
  ┌──────────────────────────────────────────────────────────────┐
  │ st.chat_input ─► session_state.pending_prompt ─► st.rerun()   │ app.py:303-305
  │ Chat tab: convo.append({"role":"user",...})                   │ app.py:262-269
  │           run_conversation(convo, MODEL, on_event=...)        │ app.py:283-285
  └──────────────────────────────┬───────────────────────────────┘
                                 ▼
  agent.py  run_conversation  (loop, max_steps = 6)
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. client.chat.completions.create(messages, tools=SCHEMAS)    │──► OpenRouter ──► Gemini/GPT/…
  │ 2. append assistant msg (with tool_calls if any)              │◄── msg.content | msg.tool_calls
  │ 3. no tool_calls?  → return msg.content          (STOP)       │
  │ 4. for each tool_call: json.loads(args)                       │
  │       func = TOOL_FUNCTIONS[name]; result = func(**args)      │
  │       append {"role":"tool","tool_call_id":id,"content":json} │
  │ 5. loop                     6 steps used → "Stopped: …"       │
  └──────────────────────────────┬───────────────────────────────┘
                                 ▼
  tools.py  (7 thin wrappers, each returns a dict or {"error": ...})
     get_quote  get_price_history  get_indicators  analyze_setup
     position_size  backtest_strategy  scan_market
                                 ▼
   data.py ──► indicators.py ──► strategies.py ──► backtest.py ──► scanner.py
  (yfinance,    (RSI, EMA, MACD,   (3 signal fns     (next-bar-open    (Nifty list in
   15-min cache) ATR, ADX, ST, BB)  + Setup)          entry, R-multiples) universe.py)
                       risk.py (stop, target, R:R, position size)
```

---

## Follow one request end-to-end

Scenario: in the Chat tab you type *"I have 2 lakh. Is there a swing trade in BAJFINANCE?"*

### Step 1: Streamlit queues the message and reruns

```python
# trading-agent/app.py:303-305
if prompt := st.chat_input("💬 Ask the agent about an NSE stock or the market…"):
    st.session_state.pending_prompt = prompt
    st.rerun()
```

Streamlit re-executes the whole script top to bottom on every interaction. The input sits at
top level (so it docks at the bottom of the page), and the chat tab handles it on the next run.
The comment at `app.py:258-261` explains this bridge. On that run the tab pops the prompt and
appends it to the **persistent** conversation list (`app.py:262-269`). The list was created
once with just the system prompt (`app.py:245-247`, `trading-agent/agent.py:92-98`).

### Step 2: the loop asks the model what to do

```python
# trading-agent/agent.py:121-130
for step in range(max_steps):
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=TOOL_SCHEMAS,   # <- this is what makes tool-calling possible
        max_tokens=1024,
    )
    msg = response.choices[0].message
```

- `messages` is the **entire** conversation so far: system prompt, earlier turns, earlier tool
  results. The model has no memory of its own. This list *is* the memory.
- `tools=TOOL_SCHEMAS` sends the 7 function descriptions. The model can now answer either with
  text or with `tool_calls`: structured requests like `analyze_setup({"symbol": "BAJFINANCE",
  "capital": 200000})`.
- `max_tokens=1024` caps reply length to limit cost (`agent.py:127-128`).

### Step 3: record the reply, then check the stop condition

```python
# trading-agent/agent.py:134-149
assistant_entry = {"role": "assistant", "content": msg.content or ""}
if msg.tool_calls:
    assistant_entry["tool_calls"] = [
        {"id": tc.id, "type": "function",
         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
        for tc in msg.tool_calls
    ]
messages.append(assistant_entry)
if not msg.tool_calls:
    return msg.content or "(the model returned no text)"
```

- The assistant message is saved **with** its `tool_calls`. The API requires this. Every
  `role: "tool"` message you send later must answer a `tool_call_id` that appears in an earlier
  assistant message.
- **Stop condition:** no tool calls means this is the final answer. That's the only normal exit.

### Step 4: run each tool and hand the result back

```python
# trading-agent/agent.py:152-180
for tc in msg.tool_calls:
    name = tc.function.name
    args = json.loads(tc.function.arguments)  # model sends args as JSON text
    if on_event:
        on_event({"type": "tool_call", "name": name, "args": args})
    func = TOOL_FUNCTIONS.get(name)
    if func is None:
        result = {"error": f"Unknown tool: {name}"}
    else:
        result = func(**args)  # <- OUR code runs the real function here
    if on_event:
        on_event({"type": "tool_result", "name": name, "result": result})
    messages.append({"role": "tool", "tool_call_id": tc.id,
                     "content": json.dumps(result)})
```

- The model **never runs code**. It returns a name and a JSON *string* of arguments. Your code
  parses it (`json.loads`), looks the name up in a plain dict (`trading-agent/tools.py:228-236`)
  and calls the function with `**args`.
- An unknown tool name becomes an error *message to the model* (`agent.py:161-163`), so it can
  correct itself.
- `on_event` is a **callback**: the UI passes in a function, and the loop calls it at each step.
  Streamlit uses it to print "🔧 analyze_setup(...)" live (`trading-agent/app.py:275-280`).
- Several tool calls in one reply (parallel tool calls) are all executed, in order, before the
  next model call.

### Step 5: what the tool actually does

`analyze_setup` (`trading-agent/tools.py:124-155`) does the following:
1. Maps `timeframe="swing"` → daily candles, 1 year of history, at least 60 bars (`trading-agent/data.py:42-49`).
2. Fetches split-adjusted OHLCV from Yahoo, with a 15-minute in-process cache (`data.py:80-121`).
3. Runs `run_strategy` (`trading-agent/strategies.py:202-234`). That adds all indicators, evaluates
   the strategy's vectorized signal on the last bar, and builds a `Setup` with ✓/✗ reasons.
4. If the setup triggered: entry = last close, stop = entry − 2×ATR, target = 2:1
   (`strategies.py:33-37`). If you passed capital, it also sizes the position: risk 1% of capital,
   floor the share count, cap at what you can afford (`trading-agent/risk.py:69-103`).
5. Any exception becomes `{"error": ...}` (`tools.py:154-155`). That way the *model* sees what went
   wrong instead of the program crashing (comment at `tools.py:55-56`).

### Step 6: loop again and get the final answer

The model now sees the setup JSON. The system prompt tells it to back trades with a backtest
(`agent.py:58-61`), so it typically calls `backtest_strategy` next. On the third call it writes
the answer, ending with the mandatory "not financial advice" line (`agent.py:74-75`). Six model
calls without a final answer returns `"Stopped: hit the max step limit without a final
answer."` (`agent.py:183`). The UI shows the answer and stores it for display (`app.py:290-291`).

---

## Concepts used here, explained from zero

**The agent loop.** An agent is "a loop around a model that can call tools". A chatbot makes
one call. An agent keeps calling, feeding back tool results, until the model says it's done.
This shape is called **ReAct** (reason → act → observe). You wrote it by hand in
`agent.py:121-183`. LangGraph's `create_react_agent` is the framework version of the same thing.
📚 ../06-agents-langchain-langgraph.md

**Function-calling JSON schema.** You describe each tool with `name`, `description` and
`parameters`, written in **JSON Schema** (a standard way to describe the shape of JSON). That
covers types, `enum` allowed values and `required` fields. The model reads the descriptions to
decide *when* to call a tool, and the schema to decide *what* arguments to send. The code builds
enums dynamically, `"enum": list(STRATEGIES.keys())` (`tools.py:339`) and `list(TIMEFRAMES.keys())`
(`tools.py:311`), so the schema can't drift from the code. Important: the schema is a *hint* to
the model, and **nothing on your side enforces it**.
📚 ../04-llm-fundamentals-sdks-tool-calling.md

**Message roles and `tool_call_id`.** `system` = standing instructions. `user` = the human.
`assistant` = the model, which may include `tool_calls`. `tool` = your result, linked back
through `tool_call_id`. A mismatched or missing tool reply makes most providers reject the
whole request.

**Stop condition and step cap.** Normal exit: a reply with no tool calls (`agent.py:147-149`).
Safety exit: `max_steps=6` (`agent.py:101`, `:183`). Without the cap, a confused model could
loop forever and burn credits.

**Dispatch table.** A dict from string to function (`tools.py:228-236`). You add a tool in
three steps: write the function, add the schema, register it (README "Extending it").

**The system prompt as a control surface.** The prompt routes timeframe from intent
(`agent.py:33-35`), maps question types to tools (`:47-65`), and sets hard rules: "ALWAYS
back claims with data you actually fetched", "a clear 'no trade, because…' is a valid
answer", "A stop-loss and position size are not optional" (`:67-76`). These are **soft
guardrails**. The model usually follows them, but nothing enforces them in code.

**Least-privilege tools.** All tools are read-only (`tools.py:11-12`). The worst a confused model
can do is fetch data. That's the most important real safety property here.

**Errors as data.** The tools catch their own exceptions and return `{"error": ...}`
(for example `tools.py:54-57`). The model reads the error and can tell you "that symbol looks
invalid" (`agent.py:76`). `position_size` is the one tool with no try/except (`tools.py:161-167`).
It handles bad input itself instead, by returning an error dict when stop ≥ entry (`risk.py:84-85`).

**OpenAI-compatible APIs (OpenRouter).** Many providers accept the OpenAI request format. You
change `base_url` and the model id, and the same code talks to Gemini or Llama (`agent.py:87-89`,
`.env.example:9`). The trade-off: support for tool calling and parallel calls varies by model,
and the free models get rate-limited (README troubleshooting table).

**Short-term memory and context windows.** Memory = re-sending the history every turn. Every turn
also re-sends every earlier tool result, including a full scan JSON. Cost and latency grow each
turn, and a long chat eventually overflows the model's context window (its maximum input
size). Nothing here trims or summarizes.

**Streamlit's execution model.** The script reruns on every click. `st.session_state` is the
only state that survives between reruns (`app.py:245-251`). `@st.cache_data(ttl=900)` caches
slow calls (`app.py:39-47`).

**Callbacks for live UI.** The loop doesn't know about Streamlit. It just calls `on_event(dict)`
if one was provided (`agent.py:158-159`, `:169-170`). The same loop powers the CLI with `print`
(`agent.py:156-157`). That's a clean separation of concerns.

**Domain concepts the tools compute.**
- *RSI / EMA / MACD / ATR* are written by hand in pandas. RSI uses Wilder smoothing, which equals
  an EWM (exponentially weighted mean) with α = 1/14 (`trading-agent/indicators.py:40-51`).
  ATR is the smoothed "true range" (`indicators.py:77-84`).
- *Vectorized signals*: each strategy is `df → boolean Series`, one True/False per bar
  (`strategies.py:70-79`, `:114-121`, `:158-162`). The **same function** feeds the live setup and
  the backtest, so they can't drift apart (docstring `strategies.py:8-14`).
- *Look-ahead bias* means using information you wouldn't have had at the time. The backtest
  enters at the **next bar's open** (`trading-agent/backtest.py:68`). Breakout compares against the
  prior 20-bar high, `.shift(1)` (`strategies.py:117`). When stop and target hit on the same bar,
  it assumes the stop hit first (`backtest.py:85`).
- *R-multiple and expectancy*: R = entry − stop. A target hit = +2R, a stop = −1R.
  Expectancy = average R per trade (`backtest.py:119`). Above 0 = a historical edge.

---

## Why it was built this way

- **No framework, on purpose.** Writing the loop by hand makes every message visible, so you can
  explain tool calling at the wire level. Frameworks hide that.
- **Deterministic tools, generative wrapper.** All the numbers come from plain Python: indicators,
  stops, sizes, backtests. The LLM only *chooses tools and explains*. That's how you keep an LLM
  from inventing prices, and the rule is restated in the prompt (`agent.py:68`).
- **Backtesting as the eval.** There's no labelled "correct trade" dataset. Instead, every
  suggestion can be checked against history, and the scanner ranks by backtested expectancy and
  flags fewer than 8 trades as low confidence (`trading-agent/scanner.py:21`, `:56`, `:61`).
- **One batched download for the scanner** (`data.py:124-157`) instead of ~50 calls, to avoid Yahoo
  rate limits.
- **Hardcoded universe** (`trading-agent/universe.py:17-33`). Scraping NSE is fragile.
- **Summaries, not raw candles.** `get_price_history` returns start/end/high/low/change, not 250
  rows (`tools.py:63-93`). That's fewer tokens and a cleaner signal for the model.
- **OpenRouter.** One key gives many models. You can switch to a free model to experiment
  (`.env.example:6-9`).

---

## What's missing / what you must not claim

- **Tool arguments are not validated.** `json.loads` then `func(**args)` (`agent.py:154`, `:165`).
  If the model invents a parameter name, `func(**args)` raises `TypeError`. I reproduced this offline:
  `position_size() got an unexpected keyword argument 'entry_price'`. Malformed JSON raises in
  `json.loads`. Both happen **outside** the tools' own try/except.
- **A crash mid-loop corrupts the chat.** The assistant message with `tool_calls` is appended
  *before* the tools run (`agent.py:144`). If a tool call then raises, no `tool` reply is ever added.
  In my offline repro, the history ended `[system, user, assistant]` with a dangling tool call.
  Streamlit catches the exception and shows "Something went wrong" (`app.py:287-289`). The
  broken history stays in `session_state`, though, so later turns will likely be rejected by the
  provider until you click "New chat". The CLI has no try/except at all (`trading-agent/main.py:37`).
  This adds to the `genai/14` write-up, which correctly flags the `TypeError` but not the
  corrupted memory.
- **No streaming of tokens.** README says it "streams its thinking". In fact it streams **tool
  events**. The final answer arrives in one piece (no `stream=True` anywhere).
- **No observability or cost tracking.** `response.usage` is never read. No tracing, no logs
  beyond `print`. No retry or timeout config beyond the `openai` SDK defaults. A new client is
  built on every turn (`agent.py:119`).
- **Unbounded history**, and `max_tokens=1024` can cut off a long answer.
- **Single provider, no fallback model.**
- **No tests at all.** That includes the backtester's anti-look-ahead logic, the most test-worthy
  code here. The README says an "always-buy" control experiment was verified, but no code or test
  for it exists in the repo. Don't claim it as tested.
- **Small inconsistencies to know before someone points them out:** the "Nifty 50" list has **51**
  symbols (`universe.py:17-33`). The prompt is NSE-only, but the `get_quote` schema mentions
  AAPL/BTC-USD (`tools.py:259`) and the CLI's default question is about Apple
  (`main.py:31`). The `.env.example` default model (`llama-3.3-70b:free`, `.env.example:9`) differs from the
  code default (`gemini-2.5-flash`, `main.py:23`, `app.py:30`).
- **Not present:** FastAPI, Pydantic, async, LangChain/LangGraph, MCP, RAG, Docker, CI, deployment.

📚 ../09-testing-pytest-jest-rtl.md · ../10-observability-and-evals.md

---

## Say it in an interview

**60-second pitch:**
> "To learn agents properly, I built a tool-calling agent from scratch, with no LangChain, on the
> OpenAI SDK pointed at OpenRouter. It's an NSE stock assistant with seven read-only tools:
> quotes, indicators, a strategy-setup analyzer, position sizing, a backtester and a Nifty 50 scanner.
> The loop sends the conversation plus JSON-schema tool definitions. If the model returns tool
> calls, I execute them from a dispatch table, append the results as tool messages tagged
> with the call id, and loop. A reply with no tool calls is the stop condition, and a six-step
> cap prevents runaway loops. The key design choice is that every number comes from
> deterministic Python and the LLM only orchestrates and explains. The system prompt enforces
> 'never invent numbers' and 'always give a stop-loss'. Since there's no labelled dataset,
> backtesting is my evaluation: the agent proves a setup with historical win-rate and
> expectancy. If I hardened it, I'd validate tool arguments with Pydantic, make tool failures
> recoverable, add tracing and cost tracking, and port it to LangGraph for checkpointed memory."

**Likely questions:**

1. **Walk me through what happens on one turn.** Use Steps 2–6 above. Name the roles, the
   `tool_call_id` linkage and the two exits (`agent.py:147-149`, `:183`).
2. **How does the model know which tool to call?** From the tool descriptions in the schema, plus the
   system prompt's intent→tool map (`agent.py:47-65`). Better descriptions and enums mean better
   routing. Enums are built from the real registries (`tools.py:311`, `:339`).
3. **What if the model hallucinates an argument?** Today it raises a `TypeError`, outside the tool's
   try/except, and leaves a dangling tool call in memory. The fix: validate `args` against a
   Pydantic model per tool, and on failure return `{"error": validation_errors}` as the tool message
   so the model retries. Always append a tool reply, even on exceptions.
4. **How do you stop it inventing prices?** Tools are the only source of numbers. The prompt
   forbids invented data (`agent.py:68`). Results are summarized JSON the model can quote. To
   *verify* it, I'd add an eval that checks every number in the answer appears in a tool result.
5. **How is memory implemented, and what breaks at scale?** It's the message list in session state
   (`app.py:245-251`). It grows without bound, every turn re-sends all tool outputs, and it dies when
   the session ends. Fixes: a window or summarization, persistence such as a LangGraph checkpointer,
   and smaller tool payloads.
6. **Why no LangChain?** To understand the protocol first. The loop is about 80 lines. I'd move to
   LangGraph when I need branching, human-in-the-loop approval or persistence.
7. **How do you know the backtest is honest?** Entry at the next bar's open, a shifted breakout
   level, a pessimistic same-bar tie-break, and no overlapping trades (`backtest.py:68`, `:85`,
   `:100`). The admission: there are no unit tests for that yet.
8. **What would you change for production?** Argument validation, retries with a fallback model,
   timeouts, a token/cost budget per turn from `response.usage`, tracing (LangSmith or OTel), tests
   with a fake LLM client, and serving it behind FastAPI with SSE streaming.

---

## Make it yours — exercises

1. **Validate tool arguments with Pydantic.** In `tools.py`, define one `BaseModel` per tool, for
   example `class PositionSizeArgs(BaseModel): entry: float; stop: float; capital: float; risk_pct: float = 1.0`.
   Generate `TOOL_SCHEMAS` from `Model.model_json_schema()`. In `agent.py:152-180`, validate before
   calling, and wrap the call in try/except so a tool message is **always** appended. Done = a
   bad argument name produces a `role: "tool"` error message, and the loop continues to a final answer.
2. **Write the first pytest suite.** Create `tests/test_agent_loop.py`. Monkeypatch
   `agent.build_client` to return a fake whose `chat.completions.create` pops scripted replies:
   one tool call, then text. Assert the final answer and the role sequence
   `system,user,assistant,tool,assistant`. Add `tests/test_risk.py` for `position_size`
   (floor, capital cap, stop ≥ entry error) and `tests/test_backtest.py` with a tiny hand-built
   DataFrame proving entry happens at the next bar's open. Done = `pytest -q` passes with no network.
3. **Add a new tool.** For example, `compare_strategies(symbol, timeframe)`, which backtests all three
   strategies and returns them sorted by expectancy. Write the function, add the schema, and register
   it in `TOOL_FUNCTIONS` (`tools.py:228-236`). Done = asking "which strategy works best on LT?"
   makes the model call your tool once instead of `backtest_strategy` three times.
4. **Add tracing and cost.** Wrap the client with LangSmith's `wrap_openai`, or with your own
   AI-observability-engine SDK's `wrap_openai`. Use `@traceable`/`@observe` on
   `run_conversation` and on each tool call. Also sum `response.usage.total_tokens` per turn
   and show it in the Streamlit status box. Done = one chat turn appears as a trace tree: turn →
   model calls → tool spans.
5. **Port the loop to LangGraph.** Turn the 7 functions into `@tool`s and build
   `create_react_agent(model, tools, checkpointer=MemorySaver())` with a `thread_id` per Streamlit
   session. Done = the same questions work, memory survives a page reload, and you can explain
   which lines of `agent.py` each LangGraph piece replaced.
