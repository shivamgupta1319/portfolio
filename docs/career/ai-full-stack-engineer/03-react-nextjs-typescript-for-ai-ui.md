# 03: React, Next.js, TypeScript for AI Interfaces

> **JD lines covered:** "Strong hands-on React.js, JavaScript/TypeScript" · "Expert-level React.js,
> Next.js, TypeScript, Tailwind CSS, and Material UI" · "polished, production-ready frontends …
> seamless interfaces for complex AI outputs and data-heavy dashboards".
>
> This is your strongest area. The fundamentals here are a fast refresher. The value is in
> **Level 3: the UI patterns specific to AI products**, which most frontend devs haven't built.
> Full React Q&A lives in [interview-qa/02](../interview-qa/02-react-nextjs.md).

---

## 🟢 Level 1: Basics (refresher)

### 1.1 React mental model

- UI = f(state). You change **state**, React re-renders, and it diffs a virtual tree before
  touching the DOM.
- **Props** flow down. **Events** flow up through callbacks.
- A component re-renders when its state changes, its parent re-renders, or a context it reads changes.

```tsx
type Props = { initial?: number; onChange?: (n: number) => void };

export function Counter({ initial = 0, onChange }: Props) {
  const [n, setN] = useState(initial);
  useEffect(() => { onChange?.(n); }, [n, onChange]);     // runs after render when n changes
  return <button onClick={() => setN((x) => x + 1)}>{n}</button>;   // functional update
}
```

### 1.2 Hooks you must know cold

| Hook | Use | Trap |
|---|---|---|
| `useState` | local state | Use the functional update when the new state depends on the old |
| `useEffect` | sync with something *outside* React (subscriptions, timers, fetch) | Missing deps cause stale closures. Return a cleanup function |
| `useRef` | mutable value that doesn't re-render (AbortController, scroll anchor) | Not for values the UI shows |
| `useMemo` / `useCallback` | skip expensive recompute / keep stable function identity | Don't sprinkle them everywhere. Profile first |
| `useContext` | read app-wide values (theme, user) | Every consumer re-renders on change. Split contexts |
| `useReducer` | complex state transitions (a chat with many event types!) | — |
| `useTransition` / `useDeferredValue` | keep typing responsive while heavy renders happen | — |

### 1.3 TypeScript you'll use in AI UIs

```ts
// Discriminated union: the single most useful TS pattern for AI event streams
type StreamEvent =
  | { type: "token"; t: string; node?: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; ok: boolean; preview: string }
  | { type: "citation"; n: number; source: string; page?: number }
  | { type: "approval"; id: string; action: string; payload: unknown }
  | { type: "done"; usage?: { in: number; out: number } }
  | { type: "error"; message: string };

function handle(e: StreamEvent) {
  switch (e.type) {
    case "token": return append(e.t);          // TS knows e.t exists here
    case "tool_call": return addStep(e.name);
    // ...
    default: { const _never: never = e; }      // compile error if you forget a case
  }
}
```

Also know: generics (`function first<T>(xs: T[]): T | undefined`), `unknown` vs `any`, utility
types (`Partial`, `Pick`, `Omit`, `Record`), `satisfies`, and **Zod** for runtime validation of
API responses (`const Ev = z.discriminatedUnion("type", [...])`).

### 1.4 Next.js App Router in one table

| Concept | What it means |
|---|---|
| `app/page.tsx` | Route. **Server Component by default**: runs on the server, can `await` data, ships no JS |
| `"use client"` | Opt in to a Client Component (state, effects, event handlers) |
| `app/api/x/route.ts` | Route Handler (your BFF endpoint), e.g. a proxy to FastAPI that hides keys |
| Server Actions | `"use server"` functions called from forms/buttons; good for mutations |
| `loading.tsx` / `error.tsx` | Suspense loading UI and error boundary per route |
| Caching | `fetch` caching / `revalidate` / `dynamic`. Opt out for per-user AI data |
| Middleware | Auth redirects, i18n, subdomain routing (your Resite portfolio subdomains) |

**Architecture choice to state in interviews:** Next.js for UI + BFF (auth, session, proxy), and
FastAPI for AI/agent logic. The browser never holds a provider API key.

---

## 🟡 Level 2: Intermediate (data, state, styling)

### 2.1 Server state with TanStack Query

```tsx
const { data, isPending, error } = useQuery({
  queryKey: ["threads"],
  queryFn: () => api.get<Thread[]>("/threads"),
  staleTime: 30_000,
});

const qc = useQueryClient();
const rename = useMutation({
  mutationFn: (t: { id: string; title: string }) => api.patch(`/threads/${t.id}`, t),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
});
```

Separate **server state** (TanStack Query) from **UI state** (useState/Zustand). Generate a typed
client from FastAPI's OpenAPI with `openapi-typescript` or `orval`, so the backend Pydantic models
become your frontend types.

### 2.2 Tailwind

Utility-first. Keep consistency with design tokens in `tailwind.config` / CSS variables, and use
`clsx` + `tailwind-merge` (`cn()`) to compose classes. shadcn/ui gives you accessible Radix
primitives styled with Tailwind, which you own as source.

### 2.3 Material UI (the JD names it, and you haven't used it)

One afternoon is enough to be credible:

```tsx
import { ThemeProvider, createTheme, CssBaseline, Button, Card, CardContent, Typography, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

const theme = createTheme({ palette: { mode: "light", primary: { main: "#2f5bd3" } },
                            shape: { borderRadius: 8 } });

const cols: GridColDef[] = [
  { field: "name", headerName: "Metric", flex: 1 },
  { field: "value", headerName: "Value", type: "number", width: 120 },
];

export function Dashboard({ rows }: { rows: { id: string; name: string; value: number }[] }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Stack spacing={2} sx={{ p: { xs: 2, md: 4 } }}>          {/* sx = responsive styles */}
        <Card><CardContent><Typography variant="h6">Insights</Typography></CardContent></Card>
        <div style={{ height: 420 }}><DataGrid rows={rows} columns={cols} /></div>
        <Button variant="contained">Generate roadmap</Button>
      </Stack>
    </ThemeProvider>
  );
}
```

Know: `ThemeProvider`/`createTheme`, the `sx` prop with breakpoints, `styled()`, MUI X DataGrid
(sorting, filtering, server-side pagination), and that MUI and Tailwind *can* coexist but you pick
one as the source of truth.

### 2.4 Forms

`react-hook-form` + `zodResolver(schema)`. The same Zod schema can mirror your Pydantic model.

### 2.5 Performance

- Virtualize long lists (`@tanstack/react-virtual`): chat histories, log tables.
- Code-split heavy components (`next/dynamic`), e.g. the charting lib or the markdown/code highlighter.
- Memoize expensive message rendering (`React.memo` on a message bubble keyed by id), so streaming
  one message doesn't re-render 300 old ones.

---

## 🔴 Level 3: AI-specific UI patterns (what the JD means by "complex AI outputs")

### 3.1 Consuming a token stream (SSE over POST)

The browser's `EventSource` only supports **GET**, and chat needs POST + an auth header. So read
the stream with `fetch` and parse SSE yourself:

```ts
export async function streamChat(body: unknown, onEvent: (e: StreamEvent) => void,
                                 signal: AbortSignal) {
  const res = await fetch("/api/agent/runs/stream", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {        // SSE events are separated by a blank line
      const raw = buf.slice(0, i); buf = buf.slice(i + 2);
      let event = "message", data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) onEvent({ type: event, ...JSON.parse(data) } as StreamEvent);
    }
  }
}
```

(`@microsoft/fetch-event-source` or the Vercel AI SDK's `useChat` do this for you. Know how it
works underneath.)

### 3.2 Chat state as a reducer

```tsx
type Msg = { id: string; role: "user" | "assistant"; text: string;
             steps: { name: string; status: "running" | "ok" | "error" }[];
             citations: { n: number; source: string; page?: number }[];
             status: "streaming" | "done" | "error" };

function reducer(msgs: Msg[], e: StreamEvent & { msgId: string }): Msg[] {
  return msgs.map((m) => {
    if (m.id !== e.msgId) return m;
    switch (e.type) {
      case "token":       return { ...m, text: m.text + e.t };
      case "tool_call":   return { ...m, steps: [...m.steps, { name: e.name, status: "running" }] };
      case "tool_result": return { ...m, steps: m.steps.map((s, i) =>
                                     i === m.steps.length - 1 ? { ...s, status: e.ok ? "ok" : "error" } : s) };
      case "citation":    return { ...m, citations: [...m.citations, e] };
      case "done":        return { ...m, status: "done" };
      case "error":       return { ...m, status: "error" };
      default:            return m;
    }
  });
}
```

### 3.3 The patterns checklist

| Pattern | Why | How |
|---|---|---|
| **Stop button** | Users must be able to cancel, and cancelling saves tokens | `AbortController.abort()`. Make sure the server sees the disconnect |
| **Agent progress / step timeline** | Agents take 10–90 s, and silence reads as "broken" | Render `step`/`tool_call` events as a live checklist: "Searching docs… ✓ Reading 4 sources… ✓" |
| **Tool-call cards** | Transparency and debuggability | Collapsible card: tool name, args, result preview, duration |
| **Citations** | Trust. JD-2 asks for "citation accuracy" | Inline `[1]` markers that open the source chunk with page and highlight. Never render a citation the backend didn't validate |
| **Human-in-the-loop approval** | Irreversible actions (send email, write DB) need consent | On an `approval` event, show Approve / Edit / Reject → `POST /runs/{id}/resume` with the decision |
| **Streaming markdown** | LLMs answer in markdown | `react-markdown` + `remark-gfm`. Sanitize (no raw HTML). Handle half-finished code fences mid-stream |
| **Structured output → real UI** | "Strategic roadmap" ≠ a wall of text | Backend returns a typed JSON roadmap → render a timeline, table and charts, not markdown |
| **Optimistic user message** | Instant feel | Append the user bubble before the request resolves |
| **Retry / regenerate / edit** | LLMs are non-deterministic | Regenerate re-runs from a checkpoint. Edit forks the thread |
| **Feedback 👍/👎** | Feeds your eval dataset ([10](10-observability-and-evals.md)) | `POST /feedback {run_id, score, comment}` attached to the trace |
| **Empty, loading, error states** | Production polish | Skeletons. Error with retry. "No sources found" is an answer, not an error |
| **Cost/latency hints** (admin) | Data-heavy dashboards | Show tokens, cost and latency per run from your traces |

### 3.4 HITL approval component

```tsx
function ApprovalCard({ runId, req }: { runId: string; req: { action: string; payload: any } }) {
  const [busy, setBusy] = useState(false);
  const decide = async (decision: "approve" | "reject", edited?: unknown) => {
    setBusy(true);
    await fetch(`/api/agent/runs/${runId}/resume`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, edited }),
    });
  };
  return (
    <div role="alertdialog" aria-labelledby="appr-title" className="rounded-lg border p-4">
      <h3 id="appr-title" className="font-semibold">Agent wants to: {req.action}</h3>
      <pre className="mt-2 max-h-64 overflow-auto text-sm">{JSON.stringify(req.payload, null, 2)}</pre>
      <div className="mt-3 flex gap-2">
        <button disabled={busy} onClick={() => decide("approve")} className="btn-primary">Approve</button>
        <button disabled={busy} onClick={() => decide("reject")} className="btn">Reject</button>
      </div>
    </div>
  );
}
```

### 3.5 Data-heavy dashboards (JD-2's "insight platform")

- Charts: Recharts / ECharts / Nivo. Big series: downsample on the server.
- Tables: TanStack Table or MUI DataGrid with **server-side** pagination, sort and filter.
- Long-running "generate report" → job + progress bar driven by SSE, rather than a spinner for 3 minutes.
- Export to CSV/PDF from the server, not by screenshotting the DOM.

### 3.6 Accessibility and responsiveness

Streaming text in an `aria-live="polite"` region. Keyboard-reachable stop and approve buttons.
Focus moves to the approval dialog. Tap targets ≥ 44 px. Test at 360/768/1280 widths.

---

## 🔧 Integration recipe: Next.js ↔ FastAPI

```
Browser ──(cookie session)──▶ Next.js Route Handler /api/agent/[...path]
                                 │  adds Authorization: Bearer <server-side token>
                                 ▼
                             FastAPI /agent/...  (streams SSE back through)
```

```ts
// app/api/agent/[...path]/route.ts: a streaming proxy (keeps tokens server-side)
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstream = await fetch(`${process.env.AGENT_API_URL}/agent/${path.join("/")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getServiceToken(req)}` },
    body: req.body, // @ts-expect-error: Node fetch needs duplex for streamed bodies
    duplex: "half",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
```

Testing these components with React Testing Library: see [09 §RTL](09-testing-pytest-jest-rtl.md).

---

## 🔗 You already did this

| Pattern | Where | Walkthrough |
|---|---|---|
| Next.js product with AI features, live | Resite, pSEO | [projects/08](projects/08-resite.md), [projects/07](projects/07-pseo-engine.md) |
| Web UI showing cited answers beside source (vanilla JS, not React) | repo-intelligence | [projects/03](projects/03-repo-intelligence.md) |
| Realtime agent progress via sockets | AgentSystem (socket.io + Redis pub/sub) | [projects/04](projects/04-agent-system.md) |
| Draft → human confirm before send | Inbox Agent | [projects/05](projects/05-inbox-agent.md) |
| Subdomain routing via middleware | Resite | [projects/08](projects/08-resite.md) |

## ✅ Self-check

1. Server vs Client Components: what can each do? Where does a chat input live?
2. Why can't you use `EventSource` for a chat POST? Write the fetch-stream parser.
3. Model a chat stream with a discriminated union and a reducer.
4. How does "Stop" actually stop token spend end to end?
5. Design the HITL approval UX and its API.
6. How do you render citations you can trust?
7. A chat with 500 messages lags while streaming. Fix it.
8. Build a MUI DataGrid with server-side pagination. What does the API look like?

## ⚠️ Traps

- Putting the provider API key in a `NEXT_PUBLIC_` env var. It ships to every browser.
- Rendering model output as raw HTML (`dangerouslySetInnerHTML`), which opens XSS via prompt injection.
- A spinner for a 60 s agent run instead of step-by-step progress.
- Re-rendering the whole message list on every token.
