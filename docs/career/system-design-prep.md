# System Design Prep — Your Unfair Advantage

> This is the round where you **win**. Most 4-YOE candidates fake system design from blog
> posts; you've *built* the systems. The only gap is **interview vocabulary and structure** —
> mapping what you did to the words interviewers listen for. Study by writing up systems you
> already built, not abstract examples.

There are two flavors. Indian product startups lean heavily on **(B) LLD / machine coding**;
GCCs lean on **(A) HLD**. Prep both.

---

## A) HLD (High-Level Design) — the framework

Use this exact structure in every HLD round (a "RESHADED"-style flow):

1. **Requirements** — functional + non-functional. Ask clarifying questions first (never
   start designing immediately). Nail down scale: users, QPS, read/write ratio, data size.
2. **Estimation** — back-of-envelope QPS, storage, bandwidth.
3. **API design** — a few key endpoints.
4. **Data model** — tables/collections, key indexes.
5. **High-level diagram** — client → LB → services → DB/cache/queue.
6. **Deep dive** — pick the 1–2 hardest parts and go deep (this is where you shine).
7. **Bottlenecks & tradeoffs** — sharding, caching, consistency, failure modes.

### Vocabulary you must use fluently (you already know the concepts):
Load balancing · horizontal vs vertical scaling · **CAP theorem** · eventual vs strong
consistency · database **sharding / partitioning** · read replicas · **caching** strategies
(cache-aside, write-through) · CDN · **message queues / back-pressure** · idempotency ·
rate limiting · **consistent hashing** · WebSockets vs long-polling · **observability**
(metrics/logs/traces).

### Study by writing up YOUR systems as design docs
For each, write a 1-page HLD you can whiteboard in 40 min. You lived these — just formalize:

| Your system | The interview question it answers | Deep-dive angle to rehearse |
|---|---|---|
| **LACS edge↔cloud sync** | "Design an offline-first app that syncs when connectivity returns" | Bidirectional sync, conflict resolution, CRDT-ish reconciliation, back-pressure |
| **pSEO multi-LLM router** | "Design a system resilient to a flaky 3rd-party API" | Failover, retries, circuit breaker, JSON repair, queue (pg-boss) |
| **pSEO pgvector dedup** | "Design a near-duplicate content detector at scale" | Vector embeddings, similarity threshold, ANN indexing |
| **Resite subdomain hosting** | "Design multi-tenant SaaS with per-customer subdomains" | Tenant isolation, wildcard DNS, routing, Puppeteer render queue |
| **CopyTrade queue engine** | "Design a reliable trade-execution pipeline" | Idempotency, at-least-once delivery, BullMQ/Redis, AES key handling |
| **StreamVerse WebRTC** | "Design a scalable video-calling system" | P2P→SFU scaling, signaling, TURN/STUN, media routing |
| **SmartTrader live scanner** | "Design a real-time market data streaming system" | WebSocket fan-out, pub/sub, throughput, reconnection |

> **This is your homework, not mine:** write ONE of these per week during Month 3. By the
> time you interview, you'll have 5–6 battle-tested designs you can present with real
> war stories ("here's what actually broke in prod and how we fixed it") — which is
> devastatingly convincing versus a candidate reciting a blog.

### Classic HLD questions to also be ready for
Design: URL shortener · rate limiter · news feed · chat/WhatsApp · notification service ·
Uber/ride-matching · YouTube/video streaming · Google Docs (collab). Map each to a system
you built where possible (chat → LACS/Echo; streaming → StreamVerse; notifications → your
Telegram alerts).

**Resources:** Alex Xu *System Design Interview* Vol 1 & 2 · ByteByteGo (YouTube) ·
github.com/donnemartin/system-design-primer (free).

---

## B) LLD / Machine Coding — where you'll dominate

Indian product startups (Flipkart, Swiggy, Razorpay, CRED, PhonePe, Meesho) run a
**90-minute machine-coding round**: build a working, extensible system with clean OOP,
no DB needed (in-memory), focus on **clean design + SOLID + extensibility**.

You build production systems daily — most candidates freeze here. **Practice the format**,
not the concepts.

### Core OOP / design principles to name-drop
SOLID · composition over inheritance · **design patterns** (Strategy, Factory, Observer,
Singleton, Builder, State) · separation of concerns · dependency injection (you use NestJS
DI daily — say that).

### Machine-coding drill list (build each in 60–90 min, in-memory, with tests)
- [ ] **Splitwise / expense splitter** — *you literally built Trip Splitter; this is a gift.* Groups, balances, settle-up.
- [ ] **Parking Lot** — the canonical LLD warm-up (Strategy + Factory).
- [ ] **In-memory key-value store with TTL / LRU cache** — you've built caching; formalize it.
- [ ] **Rate limiter** (token bucket + sliding window) — you understand back-pressure.
- [ ] **Notification service** (multi-channel: email/SMS/push — Observer + Strategy) — you built Telegram/WhatsApp/email delivery.
- [ ] **Elevator / lift system** (State pattern).
- [ ] **Snake & Ladder / Tic-Tac-Toe** — you built a tic-tac-toe game already.
- [ ] **Logging framework** (Chain of Responsibility).

### Machine-coding scoring — what they actually grade
1. **Does it run + handle the demo cases?** (correctness)
2. **Clean, extensible design** — can you add a feature in the last 10 min without rewriting?
3. **OOP modeling** — right classes, right responsibilities.
4. **Code quality** — naming, no God-classes, some tests.
NOT graded: fancy algorithms, DB, UI. Keep it simple and clean.

> Practice tip: time-box yourself with a real 90-min timer. The constraint is the skill.

---

## Milestones
- End of Month 2: 3 machine-coding builds done (Splitwise, Parking Lot, LRU).
- End of Month 3: 5–6 HLD write-ups of your own systems + Alex Xu Vol 1 read.
- Before onsites: whiteboard any of your systems in 40 min, cold.
