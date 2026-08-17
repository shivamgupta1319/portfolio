# Interview Q&A Kit — technical rounds

> Covers every technology on the skills list you send recruiters, at SDE-2 / L2 depth.
> **254 full questions** with spoken answers, **87 rapid-fire one-liners**, and
> **130 coding problems with worked JavaScript solutions** — 471 items total.
>
> Every code solution in files 09–10 has been executed against test cases, including edge
> cases. They run as written.
>
> System-design structure and behavioural stories live in their own docs — see
> [What's NOT here](#whats-not-here).

---

## The files

| # | File | Covers | Q |
|---|------|--------|---|
| 1 | [01-javascript-typescript.md](01-javascript-typescript.md) | Event loop, closures, `this`, promises, async errors, memory leaks · TS types, generics, utility types, discriminated unions, `satisfies`, strict mode | 29 + 11 |
| 2 | [02-react-nextjs.md](02-react-nextjs.md) | Reconciliation, hooks, memoisation, context, Suspense, virtualisation · App Router, RSC, SSR/SSG/ISR, caching, server actions, middleware · Tailwind · React Native/Expo · D3/Recharts | 39 + 11 |
| 3 | [03-node-nestjs-apis.md](03-node-nestjs-apis.md) | Event-loop phases, streams, cluster vs workers, graceful shutdown · NestJS DI & request pipeline · REST design, idempotency, pagination, versioning · JWT, refresh rotation, RBAC, OAuth2 · BullMQ, retries, DLQ | 40 + 13 |
| 4 | [04-python-fastapi.md](04-python-fastapi.md) | GIL, asyncio vs threads vs multiprocessing, decorators, generators · FastAPI DI, Pydantic v2, `async def` threadpool trap, deployment | 24 + 13 |
| 5 | [05-databases.md](05-databases.md) | Indexes, `EXPLAIN`, MVCC, isolation levels, deadlocks, partitioning, pooling · Prisma/Sequelize, migrations, N+1 · Redis structures, caching, eviction, locks · pgvector, HNSW vs IVFFlat, chunking, hybrid search | 35 + 13 |
| 6 | [06-devops-infra.md](06-devops-infra.md) | Docker layers, multi-stage, networking, security · CI/CD, migrations in deploys, blue-green vs canary · Nx affected & caching · Nginx proxying, WebSocket upgrade, 502s · Linux, systemd, signals, edge constraints | 31 + 13 |
| 7 | [07-specialities.md](07-specialities.md) | WebRTC signalling, ICE/STUN/TURN, P2P vs SFU vs MCU, Mediasoup, simulcast · LLM failover, structured output, RAG, evals, prompt injection · Agents & MCP · Multi-tenant isolation & RLS | 31 + 13 |
| 8 | [08-project-grilling.md](08-project-grilling.md) | **Your** projects — LACS, pSEO, Resite, StockSafe, UACE, StreamVerse, CopyTrade, SmartTrader, GIBP · honest scripts for the Kubernetes/AWS/Kafka gaps · questions to ask them | 25 |
| 9 | [09-coding-arrays-strings.md](09-coding-arrays-strings.md) | **Coding I** — JS interview toolkit · arrays & hashing · prefix sums · two pointers · sliding window · strings · binary search (incl. search-on-answer) · monotonic stack · matrix · bits · sorting · pattern cheat sheet | 65 |
| 10 | [10-coding-structures-dp.md](10-coding-structures-dp.md) | **Coding II** — linked lists · trees & BST · heaps and top-K · backtracking · graphs (BFS/DFS/topo) · union-find · intervals & greedy · DP · trie · LRU cache · complexity tables | 65 |

*Q column: full questions + rapid-fire one-liners (files 1–8), or coding problems (files 9–10).*

---

## How to use this

**Never read the answer first.** Cover it, say your answer out loud, *then* compare. Reading
produces recognition; speaking produces recall, and recall is what the interview tests.

Mark every question as you go:

- ✅ answered it cleanly out loud
- ⚠️ got the idea, fumbled the delivery
- ❌ didn't know it

Then only ever re-drill ⚠️ and ❌. Re-reading ✅ questions feels productive and isn't.

**Two format cues in the files:**

- `↳ **If pushed:**` — the follow-up that's actually coming. Interviewers rarely stop at the
  first answer; the depth probe is where the round is scored.
- `🔗 *Yours:*` — a real project of yours that demonstrates the concept. **These are the highest-
  value lines in the kit.** Any candidate can define idempotency; you can say where it bit you.
- 🔥 marks genuinely hard or commonly-fumbled questions — triage to these when short on time.

---

## Round-by-round map

| Round | Read | Notes |
|---|---|---|
| **Recruiter / screening call** | 08 | Mostly "walk me through your experience" — the project narrative matters, not the internals. |
| **Machine coding / LLD (90 min)** | 10 §11 | Format and drill list in [system-design-prep.md](../system-design-prep.md) §B. Practise against a timer. |
| **Coding / DSA** | **09, 10** | Read the cue, recall the approach, then check the code. Problem *schedule* is in [dsa-6-month-plan.md](../dsa-6-month-plan.md). |
| **Tech deep-dive (backend)** | 03, 05, 01 | Auth, queues, transactions and indexing carry the most weight. |
| **Tech deep-dive (frontend/full-stack)** | 02, 01, 03 | Expect "why does this re-render" and "why did you pick SSR here". |
| **System design / HLD** | 07, 05, 06 | Framework in [system-design-prep.md](../system-design-prep.md); the *content* is here. |
| **Hiring manager** | 08 | Decisions, tradeoffs, gaps, and the questions you ask back. |
| **Behavioural / bar-raiser** | — | See [story-bank.md](../story-bank.md). |
| **AI / GenAI rounds** | — | Different interview, own kit: [genai/INDEX.md](../genai/INDEX.md). File 07 here is the 10-minute overview; the depth is there. |

---

## Revision schedule

**Week before** — one file a day, in order. Mark ✅/⚠️/❌ as you go. Don't skip 01 because it
looks easy; the easy questions are the ones you fumble when nervous.

**Two days before** — re-drill only ⚠️ and ❌. Read file 08 fully and say three project
narratives out loud, timed to 90 seconds each.

**Night before** — the 🔥 questions, every rapid-fire table, and the
[pattern cheat sheet](09-coding-arrays-strings.md#pattern-cheat-sheet). Nothing new. Sleep
matters more than one extra topic.

**Coding round specifically** — 3–4 warm-up problems from 09/10 that morning, plus the
[JS toolkit](09-coding-arrays-strings.md#js-toolkit) (the `sort()` comparator bug alone is worth
the two minutes).

**Hour before** — file 08 only, plus your two or three questions to ask them. Walking in with
your own project stories fresh beats walking in with a half-remembered new fact.

---

## Delivery rules (worth more than any single answer)

1. **Think out loud.** A silent correct answer scores lower than a narrated one — they're
   assessing how you reason, not just what you know.
2. **Clarify before answering** anything broad. "Do you mean at the API layer or the database
   layer?" is a senior move, not a stall.
3. **Give the tradeoff, unprompted.** Every answer should carry a cost you accepted. "I'd use X,
   which costs Y, and I'd accept that because Z" is the sentence that reads as SDE-2.
4. **Say "I don't know" cleanly** — then say what you *would* do to find out, or the nearest
   thing you do know. One honest gap costs almost nothing. One bluff caught costs the round.
   The scripts in [08](08-project-grilling.md#honest-gaps--kubernetes-aws-kafka) show the shape.
5. **Anchor to real work.** "In LACS we hit exactly this" ends the line of questioning in your
   favour.
6. **Never claim a number you can't defend.** If a metric in these docs is marked `[verify]`,
   verify it before you say it.

---

## What's NOT here

Deliberately, so nothing is duplicated or drifts out of sync:

| Topic | Doc |
|---|---|
| DSA study *schedule* & spaced repetition (solutions are in 09–10) | [dsa-6-month-plan.md](../dsa-6-month-plan.md) |
| HLD framework & machine-coding drills | [system-design-prep.md](../system-design-prep.md) |
| STAR stories, "why are you leaving", failure story | [story-bank.md](../story-bank.md) |
| Resume metrics & ATS keywords | [resume-v2.md](../resume-v2.md) |
| Salary framing, negotiation, pipeline | [application-tracker.md](../application-tracker.md) |
| LinkedIn & inbound | [linkedin-optimization.md](../linkedin-optimization.md) |
| **GenAI depth** — transformers, RAG strategies, agents in production, evals, serving, safety, AI system design, AI project deep-dives | [genai/INDEX.md](../genai/INDEX.md) |

---

## Weak-spot tracker

Fill this in after each pass. The pattern across rows tells you where to spend the next week.

| File | Pass 1 (✅/⚠️/❌) | Pass 2 | Still weak |
|---|---|---|---|
| 01 — JS & TS | | | |
| 02 — React & Next | | | |
| 03 — Node, Nest, APIs | | | |
| 04 — Python & FastAPI | | | |
| 05 — Databases | | | |
| 06 — DevOps & Infra | | | |
| 07 — Specialities | | | |
| 08 — Projects | | | |
| 09 — Coding I | | | |
| 10 — Coding II | | | |

---

← Back to the [Career Acceleration Kit](../README.md)
