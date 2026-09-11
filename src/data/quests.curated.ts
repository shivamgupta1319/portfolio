import type { CuratedQuest } from "./types";

/**
 * Curated overrides keyed by GitHub repo name. Anything here is deep-merged
 * over the generated GitHub record (curated wins). `featured: true` promotes a
 * repo to a "main quest" with hand-written copy; `synthesize: true` makes it
 * render even when the GitHub fetch didn't return it (private repos in CI).
 *
 * `order` drives the profile page's featured sequence (1 = first). Copy only
 * claims what the project's README / code supports.
 */
export const curated: Record<string, CuratedQuest> = {
  // ── flagships (featured / main quests) ───────────────────────────
  "programmatic-SEO-engine": {
    title: "pSEO Engine",
    summary:
      "Programmatic-SEO SaaS: quality-gated landing pages shipped as PRs into your own repo.",
    description:
      "A developer-first programmatic-SEO SaaS that generates and quality-gates penalty-resistant landing pages, then ships them into a customer's own Next.js/Astro repo via GitHub PR or a pull-API. Built-in pgvector dedup, thin-content guardrails, a multi-LLM router with failover, self-hosted Better Auth, and Polar billing.",
    highlights: [
      "Live at pseo.cloud — designed, built, deployed and billed end-to-end",
      "Multi-LLM router: DB-driven chain, typed failover, per-call cost tracking",
      "pgvector dedup + thin-content and SSRF guards before anything ships",
    ],
    liveUrl: "https://pseo.cloud",
    liveLabel: "pseo.cloud",
    tags: ["Next.js 15", "Drizzle", "Postgres + pgvector", "Better Auth", "pg-boss", "Multi-LLM Router", "Polar Billing"],
    category: ["product", "ai"],
    rank: "S",
    featured: true,
    order: 1,
    year: 2026,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "repo-intelligence": {
    title: "repo-intelligence",
    summary:
      "Code-intelligence engine: cited path:line answers to “explain auth” over any TS/JS repo.",
    description:
      "A code-intelligence engine that answers concern-level questions (\"explain authentication\") about unfamiliar TypeScript/JavaScript repositories with verified path:line citations. Tree-sitter builds a real code graph — symbols, imports, calls, routes, ORM models; chunks are cut on symbol boundaries; BM25 and local code-specialised embeddings (transformers.js) are fused with reciprocal rank fusion; and a citation validator re-reads every cited file from disk and refuses the whole answer when more than 30% of claims fail. Retrieval is measured with a hand-labelled `ri eval` harness against a fair grep baseline — and the published finding is that search and ranking do most of the work while the graph adds a small, unstable increment.",
    highlights: [
      "Hybrid BM25 + local code embeddings, fused with RRF",
      "Citation validator re-reads from disk; refuses answers above 30% unverified claims",
      "Labelled eval harness across 4 repos with a fair grep control · 300+ tests",
    ],
    tags: ["TypeScript", "tree-sitter", "BM25 + Embeddings", "RRF", "transformers.js", "Eval Harness", "Local Web UI"],
    category: ["ai", "tools"],
    rank: "S",
    featured: true,
    order: 2,
    year: 2026,
    status: "active",
    synthesize: true,
    language: "TypeScript",
  },
  "lacs-v2": {
    title: "LACS / X-FACE",
    summary:
      "Disaster-response comms platform: WebRTC, on-device ASR/TTS, offline-first edge↔cloud sync.",
    description:
      "A deployed disaster-response communication platform for front-line teams: multimodal voice / video / text over Mediasoup WebRTC, FFmpeg recording and playback so past incidents can be reviewed, on-device ASR/TTS and NLP, push-button SOS, and GIS mapping with live GPS positions. Offline-first by construction — each field node runs its own PostgreSQL and SFU with bidirectional edge↔cloud sync on reconnect — plus a cross-platform Expo client and Ansible-driven one-touch provisioning of mini-PC field hardware.",
    highlights: [
      "40+ concurrent users per node across 25–30 deployed field systems",
      "Zero-internet operation: local Postgres + SFU per node, bidirectional sync on reconnect",
      "Showcased at ATR Open House 2025, Kyoto",
    ],
    liveUrl: "https://dr.alwacs.com",
    liveLabel: "live platform",
    credit: "Team · ATR / Wisflux",
    tags: ["Mediasoup / WebRTC", "FFmpeg Recording", "On-device ASR / TTS", "NestJS", "Edge↔Cloud Postgres Sync", "Expo", "GIS / GPS", "Ansible", "Docker / systemd"],
    category: ["realtime", "product"],
    rank: "S",
    featured: true,
    order: 3,
    year: 2025,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "AI-ROUTER": {
    title: "AI-ROUTER",
    summary:
      "OpenAI-compatible gateway over 8 free-tier AI providers — live, serving 5 projects.",
    description:
      "A self-hosted, OpenAI-compatible gateway: point any project's stock `openai` SDK at one base URL and delete its provider code. Chat, structured JSON, streaming, tools, vision, embeddings, reranking, images, speech and transcription across 8 upstream providers on free tiers. Health is maintained ahead of requests by a background prober plus the outcome of every real call, so the first hop is a model already known to be answering; routing scores first-try JSON-schema validity, success rate and latency with a minimum sample size and a small exploration slice; failures have a vocabulary (`empty`, `schema_invalid`, `retired`, `rate_limited`…) because a 200 with blank content is not a success. One wall-clock budget spans every hop, embedding fallback never crosses vector dimensions, and streaming fails over only before the first token.",
    highlights: [
      "Live at ai.pseo.cloud · serving 5 of my projects in production",
      "10 capabilities across 8 providers behind one OpenAI-compatible base URL",
      "185 tests · health-first routing with a measured model quality scorecard",
    ],
    liveUrl: "https://ai.pseo.cloud",
    liveLabel: "ai.pseo.cloud",
    tags: ["TypeScript", "OpenAI-compatible API", "Multi-Provider Failover", "Health Probing", "Streaming / SSE", "Embeddings + Rerank", "Docker"],
    category: ["ai", "tools"],
    rank: "S",
    featured: true,
    order: 4,
    year: 2026,
    status: "live",
    synthesize: true,
    language: "TypeScript",
  },
  resite: {
    title: "Resite",
    summary:
      "AI résumé builder with ATS scoring and one-click portfolio publishing to your own subdomain.",
    description:
      "An AI résumé platform: build and tailor ATS-optimized résumés, score any résumé against a job description, and publish a personal portfolio to your own subdomain. A NestJS API drives queue-based résumé parsing (PDF/DOCX) and Puppeteer PDF rendering, backed by Postgres for multi-tenant subdomain hosting, with a Next.js 15 app on top.",
    highlights: [
      "Live at resite.live",
      "Queued PDF/DOCX parsing + Puppeteer rendering over BullMQ",
      "Wildcard-subdomain multi-tenant portfolios",
    ],
    liveUrl: "https://resite.live",
    liveLabel: "resite.live",
    tags: ["Next.js 15", "NestJS", "PostgreSQL + TypeORM", "BullMQ + Redis", "Puppeteer", "ATS Scoring", "Subdomain Portfolios"],
    category: ["product", "ai"],
    rank: "S",
    featured: true,
    order: 5,
    year: 2026,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "stocksafe-bundles": {
    title: "StockSafe Bundles",
    summary:
      "Shopify App Store app that keeps fixed-bundle inventory truthful across locations.",
    description:
      "A Shopify app — live on the Shopify App Store — that keeps fixed-bundle inventory trustworthy across locations. A reconcile → diagnose → audit engine computes true per-location sellable quantity, names the bottleneck component when a bundle reads zero, and keeps an append-only audit trail no incumbent has.",
    highlights: [
      "Live on the Shopify App Store — shipped through app review",
      "Reconcile → diagnose → audit: names the bottleneck component when a bundle reads zero",
      "Idempotent, out-of-order-safe webhook handling",
    ],
    liveUrl: "https://apps.shopify.com/stocksafe-bundles",
    liveLabel: "Shopify App Store",
    tags: ["Shopify App", "React Router", "Prisma", "Postgres (Neon)", "pg-boss", "Render"],
    category: ["product"],
    rank: "S",
    featured: true,
    order: 6,
    year: 2026,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  UACE: {
    title: "UACE — Universal AI Context Engine",
    summary:
      "Published MCP server giving every AI coding assistant one shared, local-first project brain.",
    description:
      "A published npm MCP server that gives every AI coding assistant (Claude Code, Cursor, Copilot) one shared, local-first \"Project Brain\" — so a brand-new session continues without re-explaining the codebase. 18 MCP tools and 2 prompts, offline semantic search (sqlite-vec + local embeddings), git ingestion, live file-watch, and a companion VS Code extension.",
    highlights: [
      "18 MCP tools + 2 prompts, published to npm as uace-mcp",
      "Offline semantic search: sqlite-vec + local MiniLM embeddings, FTS5/BM25 fallback",
      "Companion VS Code extension",
    ],
    npmUrl: "https://www.npmjs.com/package/uace-mcp",
    tags: ["MCP", "TypeScript", "SQLite + sqlite-vec", "Local Embeddings", "VS Code Extension"],
    category: ["ai", "tools"],
    rank: "S",
    featured: true,
    order: 7,
    year: 2026,
    status: "live",
  },
  "market-news": {
    title: "market·news",
    summary:
      "Real-time news terminal for NSE, US equities and crypto — deduped, ticker-tagged, ranked.",
    description:
      "A real-time market-news terminal for Indian equities, US equities and crypto. It polls dozens of free sources — RBI, SEBI, Federal Reserve, ECB and SEC EDGAR primary documents, the major wires and the financial press — each with a tier and trust weight, conditional GET, per-host politeness and automatic retirement of dead feeds. One event becomes one story through three dedup layers (canonical URL → near-identical headline → embedding similarity); a deterministic tagger matches 18,000 NSE/BSE/SEC/CoinGecko instruments with guards against \"Amazon rainforest ≠ AMZN\"; a 0–100 impact score ranks by authority, category, corroboration, watchlist and freshness. AI runs only above thresholds and within an hourly budget, returns enums and prose but never a price, and every trade idea is scored at +1h/+1d/+1w against NIFTY, the S&P 500 or BTC — and recorded as wrong when it is.",
    highlights: [
      "33 sources · 3-layer dedup (URL → headline → embeddings)",
      "Deterministic ticker tagging over 18,000 instruments — before any AI runs",
      "Every AI trade idea scored against a real benchmark at +1h / +1d / +1w",
    ],
    tags: ["TypeScript", "pnpm Monorepo", "RSS Ingestion", "Embedding Dedup", "Ticker Tagging", "Impact Ranking", "AI Briefings"],
    category: ["fintech", "ai", "realtime"],
    rank: "A",
    featured: true,
    order: 8,
    year: 2026,
    status: "active",
    synthesize: true,
    language: "TypeScript",
  },
  "smart-trading": {
    title: "SmartTrader",
    summary:
      "Polyglot NSE trading platform: 28 backtested strategies, live scanner, Telegram alerts.",
    description:
      "A polyglot NSE trading platform on an Nx monorepo: backtests 28 documented strategies, streams a live market scanner over WebSockets, and fires Telegram breakout alerts. React + Vite UI, NestJS + Prisma API, and a Python FastAPI quant engine.",
    highlights: [
      "28 documented strategies over ~2,000 NSE symbols",
      "Live scanner every 60 s → WebSocket + Telegram alerts",
    ],
    tags: ["Nx Monorepo", "NestJS", "React", "Python FastAPI", "PostgreSQL", "Socket.io", "Docker"],
    category: ["fintech", "realtime"],
    rank: "S",
    featured: true,
    order: 9,
    year: 2026,
    status: "active",
  },
  "strategy-backtest": {
    title: "strategy-backtest",
    summary:
      "NSE strategy research net of real Dhan costs — pre-registered, with published verdicts.",
    description:
      "NSE trading-strategy research where a phase that ends in \"no tradable edge\" is a complete outcome. Each phase is one question, one pre-registered search and one written verdict. Phase 1 (intraday): a marginal, decaying edge on 2 of 182 stocks, now paper-trading live. Phase 2 (positional delivery): 0 of 48 pre-registered cells beat Nifty200 Momentum 30 on Sharpe after costs, so the holdout was never opened — and that is published. Two engines (single-symbol for reproducibility, portfolio for N concurrent positions) whose trade lists and equity curves reconcile to the rupee; a cost model applying Dhan's intraday and delivery rate cards per order, golden-tested to the paisa; pessimistic fills (signal on close, fill next open); data-integrity canaries for vendor re-adjustments.",
    highlights: [
      "Phase 2: 0 of 48 pre-registered cells beat Nifty200 Momentum 30 — published as a negative result",
      "Costs to the paisa: Dhan intraday + delivery rate cards, golden-tested",
      "318 tests · two reconciling engines · ~2,000-name NSE universe",
    ],
    tags: ["Python", "uv", "pandas / Parquet", "Backtesting", "Cost Modelling", "Pre-registration"],
    category: ["fintech"],
    rank: "A",
    featured: true,
    order: 10,
    year: 2026,
    status: "active",
    synthesize: true,
    language: "Python",
  },
  "AI-observability-engine": {
    title: "AI Observability Engine",
    summary:
      "LLM tracing platform: prompts, tokens, cost and latency across chains and agents.",
    description:
      "An LLM-application tracing product in the Langfuse/Helicone category — built, not just used. Postgres holds config and metadata (teams, projects, API keys, users, model pricing); ClickHouse stores trace events behind a rollup materialised view so dashboards never scan raw spans; Redis buffers ingestion. A Python SDK ships an `@observe` decorator, context managers and OpenAI/Anthropic wrappers; cost is enriched at ingestion from a pricing table so a later price change never rewrites history. Auth, sessions, RBAC, an admin API and an RBAC-scoped query API with trace trees and CSV export are shipped (phases P1–P6a); the Next.js dashboard is a scaffold and the system has not taken production traffic.",
    highlights: [
      "Postgres + ClickHouse split with a rollup MV for trace analytics",
      "Python SDK: @observe, context managers, OpenAI / Anthropic wrappers",
      "P1–P6a shipped · 161 backend tests",
    ],
    tags: ["Python 3.12", "FastAPI", "ClickHouse", "PostgreSQL", "Redis", "Next.js", "RBAC", "Python SDK"],
    category: ["ai", "tools"],
    rank: "A",
    featured: true,
    order: 11,
    year: 2026,
    status: "wip",
    synthesize: true,
    isPrivate: true,
    language: "Python",
  },
  "indian-ipo": {
    title: "Indian IPO Tracker",
    summary:
      "Every Indian IPO (mainboard + SME) on a published rubric — quality vs demand, never averaged.",
    description:
      "Tracks every Indian IPO — mainboard and SME — from announcement to listing, keeping three data layers deliberately separate: NSE subscription (exchange primary source, per-category bids), grey-market premium (unregulated hearsay, labelled as such everywhere it appears) and RHP fundamentals. Two scores are never averaged — quality asks whether the business is worth owning at this price, demand whether it will pop on listing day — and the 2×2 surfaces the cell GMP sites hide: hot book, weak business. Day-1 subscription is reported as unknown rather than weak, retail allotment odds are shown prominently, and every score is stored immutably with the inputs it saw so a track-record page can say whether it predicts anything. NestJS 11 + Kysely on Postgres 17 (Postgres is the queue — FOR UPDATE SKIP LOCKED, no Redis), Vite + React 19 frontend, one Docker image running four services; the API never fetches upstream on the request path.",
    highlights: [
      "3 separated layers: NSE subscription · GMP (labelled hearsay) · RHP fundamentals",
      "Quality vs demand scores never blended; allotment odds shown up front",
      "Immutable pre-listing snapshots feed a public track record",
    ],
    tags: ["NestJS 11", "Kysely + Postgres 17", "Vite + React 19", "Docker Compose", "NSE Data", "Scoring Rubric"],
    category: ["fintech"],
    rank: "A",
    featured: true,
    order: 12,
    year: 2026,
    status: "active",
    synthesize: true,
    language: "TypeScript",
  },
  streamverse: {
    title: "StreamVerse",
    summary:
      "npm WebRTC SDK: calls, streaming and screen share with automatic P2P→SFU scaling.",
    description:
      "A published TypeScript SDK that distills WebRTC signaling and connection management into a few lines for video calls, live streaming and screen sharing — with automatic P2P→SFU scaling, a hosted signaling option, and a live multi-user demo.",
    highlights: [
      "Published on npm as streamverse",
      "Automatic P2P → Mediasoup SFU escalation",
    ],
    npmUrl: "https://www.npmjs.com/package/streamverse",
    liveUrl: "https://streamverse-delta.vercel.app",
    liveLabel: "live demo",
    tags: ["WebRTC", "Mediasoup SFU", "TypeScript", "npm Package", "Socket.io"],
    category: ["realtime", "tools"],
    rank: "S",
    featured: true,
    order: 13,
    year: 2025,
    status: "live",
  },
  "crypto-ai": {
    title: "crypto-ai — Quant Engine",
    summary:
      "Crypto-futures quant engine: 12 strategies, walk-forward / Monte-Carlo, ML meta-labeling.",
    description:
      "A crypto-futures research and paper-trading system running 12 long/short strategies through one engine, hardened by walk-forward, Monte-Carlo and out-of-sample robustness testing. Adds a scikit-learn meta-label P(win) filter, regime detection, and a human-in-the-loop self-optimizing agent.",
    highlights: [
      "12 long/short strategies through one engine",
      "Walk-forward, Monte-Carlo and out-of-sample robustness testing",
      "scikit-learn meta-label P(win) filter + regime detection",
    ],
    tags: ["Python", "FastAPI", "scikit-learn", "React", "Docker", "CI"],
    category: ["fintech", "ai"],
    rank: "S",
    featured: true,
    order: 14,
    year: 2026,
    status: "active",
  },
  "gibp-project": {
    title: "GIBP",
    summary:
      "Multi-tenant fintech/accounting platform on the Formance ledger, with E2E-tested money flows.",
    description:
      "A production-grade multi-tenant fintech / accounting platform: a NestJS API integrated with the Formance financial ledger for organizations, accounts, bills, vendors and reconciliation, with company and super-admin React portals. Nx monorepo with database migrations, role-based access and full E2E test coverage.",
    highlights: [
      "Formance ledger integration across multiple tenant organisations",
      "Playwright end-to-end coverage on money-movement flows",
    ],
    credit: "Team · Wisflux",
    tags: ["NestJS", "Formance Ledger", "Nx Monorepo", "React 19", "PostgreSQL / Sequelize", "Playwright"],
    category: ["fintech", "product"],
    rank: "A",
    featured: true,
    order: 15,
    year: 2024,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "copy-trading": {
    title: "CopyTrade Pro",
    summary:
      "Signal-driven crypto-futures execution with LLM risk checks and queue-based workers.",
    description:
      "An automated crypto-futures platform that ingests trade signals, validates them through LLM risk-checks, and executes on Binance Futures via a custom CCXT layer. Resilient queue-based architecture (NestJS + BullMQ/Redis workers), AES-256-GCM key encryption, and live P&L / Sharpe / win-rate analytics.",
    tags: ["Nx Monorepo", "NestJS", "BullMQ + Redis", "CCXT", "PostgreSQL", "AES-256"],
    category: ["fintech"],
    rank: "A",
    featured: true,
    order: 16,
    year: 2026,
    status: "active",
  },
  "drl-trading": {
    title: "DRL Trading Agent",
    summary:
      "Deep-RL intraday agent on a custom Gymnasium env that models real NSE costs.",
    description:
      "A Deep Reinforcement Learning intraday agent (PPO/A2C/SAC via Stable-Baselines3) on a custom Gymnasium environment modeling real NSE costs — STT, GST, slippage, stamp duty. Trains on a risk-adjusted composite reward with drawdown, concentration and overtrading penalties.",
    tags: ["Python", "Stable-Baselines3", "Gymnasium", "PyTorch", "pandas-ta"],
    category: ["fintech", "ai"],
    rank: "A",
    featured: true,
    order: 17,
    year: 2026,
    status: "active",
  },
  "web-dev-workflow": {
    title: "Glacier Dev",
    summary:
      "Autonomous multi-agent web builder: prompt → Architect/Backend/UI agents → deployed app.",
    description:
      "An autonomous AI web-development platform where specialized Architect, Backend and UI agents take an idea from prompt to a deployed app. Multi-provider LLM orchestration with failover and JSON repair, an in-browser Monaco/Sandpack editor, and one-click GitHub→Vercel deploy on Supabase.",
    tags: ["Next.js 14", "Gemini", "OpenRouter", "Supabase", "Monaco", "Sandpack"],
    category: ["ai"],
    rank: "A",
    featured: true,
    order: 18,
    year: 2026,
    status: "active",
  },
  "outlook-dashboard": {
    title: "Inbox Agent (MCP)",
    summary:
      "Local-first mail assistant exposing a needs-reply queue to Claude through MCP.",
    description:
      "A local-first AI mail assistant that unifies multi-account Gmail into a \"needs-reply\" queue and exposes it to Claude through a Model Context Protocol server for summarizing, analyzing and drafting replies. TypeScript monorepo with encrypted token storage and a React dashboard.",
    tags: ["MCP", "TypeScript", "Gmail API", "SQLite", "React"],
    category: ["ai", "tools"],
    rank: "A",
    featured: true,
    order: 19,
    year: 2026,
    status: "active",
  },
  echo: {
    title: "Echo",
    summary:
      "Offline-first, E2E-encrypted PWA messenger for two people with LAN-first WebRTC calls.",
    description:
      "An offline-first, self-hosted PWA messaging platform built for exactly two people — end-to-end encrypted with libsodium and WebRTC P2P voice/video that prioritizes LAN-direct connections. A local-first IndexedDB architecture treats the server as a mere sync target; QR pairing, no accounts, no cloud harvesting.",
    tags: ["PWA", "WebRTC", "libsodium E2E", "IndexedDB", "TypeScript", "Docker"],
    category: ["realtime"],
    rank: "A",
    featured: true,
    order: 20,
    year: 2026,
    status: "active",
  },
  "card-selector": {
    title: "Card Selector",
    summary:
      "Scan physical cards with OCR, store them encrypted, get the best card for any purchase.",
    description:
      "A local-first AI assistant that scans physical cards with a PaddleOCR/OpenCV computer-vision service, stores details under AES-256 encryption, and uses Gemini to parse offer text and recommend the optimal card for any purchase. Next.js PWA + NestJS backend + FastAPI OCR microservice.",
    tags: ["Next.js", "NestJS", "FastAPI", "PaddleOCR", "Gemini", "AES-256", "PWA"],
    category: ["ai"],
    rank: "A",
    featured: true,
    order: 21,
    year: 2026,
    status: "active",
  },
  typezap: {
    title: "Typezap / Emmple",
    summary:
      "Live ed-tech platform blending touch-typing with school subjects — 2,000+ students.",
    description:
      "A live ed-tech learning platform (~2 years in production) that blends touch-typing with core subjects through a Read → Answer → Type loop grounded in the neuroscience of learning. Grade-specific content with quizzes that unlock lessons, leaderboards and friend challenges, achievement certificates, and multi-channel delivery over WhatsApp, email and web.",
    highlights: ["2,000+ students across web and WhatsApp", "~2 years in production"],
    liveUrl: "https://emmple.com",
    liveLabel: "emmple.com",
    credit: "Team · Wisflux",
    tags: ["Ed-Tech SaaS", "Gamified Learning", "Touch Typing", "Quizzes & Certificates", "Leaderboards", "WhatsApp"],
    category: ["product"],
    rank: "A",
    featured: true,
    order: 22,
    year: 2024,
    status: "live",
    synthesize: true,
    isPrivate: true,
  },

  // ── side quests ──────────────────────────────────────────────────
  dividend: {
    title: "Dividend + MTF Screener",
    summary:
      "NSE dividend ex-date screener with Groww MTF leverage and honest net-of-cost economics.",
    description:
      "Finds NSE stocks with an upcoming dividend ex-date, works out whether Groww's MTF gives leverage on them, sizes a position against your capital, and costs the whole round trip: MTF interest, brokerage, STT, stamp duty, GST, DP charges and slab tax on the dividend. Because the ex-date drop cancels the payout, the honest ranking key is breakeven recovery — how much of the drop a stock must claw back just to pay for the trade. Flags dividend-stripping traps and the real last buy date across NSE holidays; an optional AI read (via AI-ROUTER) classifies payout pattern but never predicts a percentage.",
    highlights: [
      "Full round-trip cost model: interest, brokerage, STT, stamp, GST, DP, slab tax",
      "Ranks on breakeven recovery % — the honest screen",
      "Deployed (private beta) · parser + economics regression tests",
    ],
    tags: ["Python", "SQLite", "Vite", "NSE Corporate Actions", "MTF / Leverage", "Cost Modelling"],
    category: ["fintech"],
    rank: "A",
    year: 2026,
    status: "live",
    synthesize: true,
    language: "Python",
  },
  "youtube-auto-stream": {
    title: "YouTube Auto Stream",
    summary:
      "Three YouTube channels from one codebase — AI-generated daily, human-approved before publish.",
    description:
      "Autonomous, AI-assisted, human-approved YouTube automation running three channels from one codebase and one Docker image: a daily narrated anime self-improvement motion-comic episode plus a derived Short, and Chart A Day — data-driven market shorts, each an animated candlestick reveal with narration built from live crypto and spot-gold data. Content is generated daily, waits at an approval gate for a one-tap decision, then publishes and monitors performance. Built to stay free (NVIDIA NIM + OpenRouter, edge-tts, ffmpeg, keyless market data) and policy-safe: original content, real variation, and a human gate rather than mass upload.",
    highlights: [
      "3 channels · 1 codebase · 1 Docker image",
      "Human approval gate before every publish",
      "Zero-cost stack: NVIDIA NIM + OpenRouter + edge-tts + ffmpeg",
    ],
    liveUrl: "https://youtube.com/@chartaday",
    liveLabel: "@chartaday",
    tags: ["Python", "uv", "NVIDIA NIM", "OpenRouter", "edge-tts", "ffmpeg", "YouTube API", "Docker"],
    category: ["ai", "tools"],
    rank: "B",
    year: 2026,
    status: "live",
    language: "Python",
  },
  "geo-india": {
    title: "geo-india",
    summary:
      "Drill-down geospatial dashboard for India (country → state → district → ward) on PostGIS.",
    description:
      "An interactive, multi-level geospatial dashboard for India: click from the country down through state, district, municipal body and ward, with stats and a scoped feed at every level — built entirely on open data and free tiers (no paid tiles or geocoding). PostgreSQL 18 + PostGIS 3.6 with ltree and pg_trgm, NestJS 11 + Kysely with raw SQL for the spatial layer, Next.js 15 + React 19 + MapLibre GL v5, a Python 3.12 + DuckDB/ogr2ogr ingest pipeline, self-baked PMTiles served by nginx, and Valkey 8 for cache. Stage 3 of 10: the map works, with 36 states and 785 districts parented, QA-gated and simplified into 4,110 LOD geometries.",
    highlights: [
      "36 states · 785 districts · 4,110 LOD geometries, QA-gated",
      "PostGIS 3.6 + self-baked PMTiles — zero paid map services",
    ],
    tags: ["PostGIS", "NestJS 11", "Next.js 15", "MapLibre GL", "PMTiles", "DuckDB / ogr2ogr", "Valkey"],
    category: ["tools"],
    rank: "B",
    year: 2026,
    status: "wip",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "project-hub": {
    title: "Project Hub",
    summary:
      "Local dashboard over ~90 workspace projects: live git state, triage rules, sub-second scan.",
    description:
      "A local, read-only dashboard for every project in a workspace. Each request reads live git and filesystem state and merges in hand-set status, priority and tags. \"Last activity\" uses the cheapest honest signal per project — last commit for clean repos, mtimes of the files git status reports for dirty ones, a bounded walk only when there is no repo — so build output never masquerades as work and a full scan of ~90 projects stays near 0.8 s. A deliberately short needs-attention list fires only on actionable rules (unpushed, abandoned-uncommitted, drifting, untriaged, undocumented). Runs under Docker Compose.",
    highlights: [
      "~90 projects scanned in ~0.8 s, strictly read-only",
      "5 actionable triage rules instead of flagging everything",
    ],
    tags: ["TypeScript", "pnpm", "Git", "Docker Compose"],
    category: ["tools"],
    rank: "B",
    year: 2026,
    status: "active",
    synthesize: true,
    language: "TypeScript",
  },
  "AI-TRADING-BRAIN": {
    title: "AI Trading Brain",
    summary:
      "Zero-cost swing-trading research platform for NSE — honest before clever, benchmarked vs Nifty 50.",
    description:
      "A research platform for Indian equity swing trading whose primary job is to say, honestly, whether an idea beats buying an index fund after real costs. Data platform first (free NSE data into DuckDB/Parquet), an event-driven backtester that makes look-ahead bias structurally hard, deliberately dumb strategies before any ML, LightGBM over deep learning (right-sized for a few thousand effective samples), triple-barrier labels with walk-forward validation, and frozen-strategy forward paper trading as the only fully honest test. An LLM may parse text into features but never makes the decision.",
    highlights: [
      "Everything measured against buy-and-hold Nifty 50, after costs",
      "Triple-barrier labels + walk-forward CV; LightGBM, not deep RL",
      "\u20b90 stack: free NSE data, DuckDB, one always-on local machine",
    ],
    tags: ["Python 3.12", "DuckDB / Parquet", "pandas", "LightGBM", "Backtesting", "Walk-forward CV"],
    category: ["fintech", "ai"],
    rank: "A",
    year: 2026,
    status: "wip",
    synthesize: true,
    language: "Python",
  },
  "Photo-AI": {
    title: "Photo-AI",
    summary:
      "File sharing with on-device face recognition — find photos by who is in them, no cloud vision API.",
    description:
      "A file-sharing service with face recognition built in: upload photos into folders and the backend detects and matches faces locally so images can be found by the people in them. Detection runs on-device with TensorFlow.js and face-api (landmarks, expression, age/gender models bundled) — photos never leave the server. NestJS + TypeORM on PostgreSQL with JWT auth and Multer uploads, sharp for image processing, and a React + Chakra UI front end.",
    highlights: [
      "On-device face detection + matching (TensorFlow.js, face-api) — no third-party vision API",
      "Folder hierarchy, JWT auth, PostgreSQL via TypeORM",
    ],
    tags: ["NestJS", "TensorFlow.js", "face-api", "PostgreSQL", "React", "Chakra UI", "Docker"],
    category: ["ai", "tools"],
    rank: "B",
    year: 2025,
    status: "archived",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  nova: {
    title: "Nova",
    summary:
      "Self-hosted private communication app for two: chat, WebRTC calls, screen share, media vault, PIN pairing.",
    description:
      "A self-hosted communication platform built for exactly two people — no accounts, no social graph, no cloud dependency. Real-time chat with voice messages and media, peer-to-peer WebRTC voice/video calls with screen sharing, a shared media vault organised into albums, a dashboard with partner status, and 6-digit PIN pairing instead of passwords. Installable as a PWA. Next.js 15 front end, NestJS + TypeORM + PostgreSQL backend, Socket.IO signalling, Docker Compose + Nginx.",
    highlights: [
      "WebRTC calls + screen share, Socket.IO chat with read receipts",
      "PIN pairing, PWA install, runs entirely on your own box",
    ],
    tags: ["Next.js 15", "NestJS", "PostgreSQL", "Socket.IO", "WebRTC", "PWA", "Docker"],
    category: ["realtime"],
    rank: "B",
    year: 2025,
    status: "archived",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "postgresql-db-sync": {
    title: "PostgreSQL DB Sync",
    summary:
      "Offline-first sync service keeping PostgreSQL aligned across disconnected field units and the cloud.",
    description:
      "An offline-first synchronisation service that keeps PostgreSQL databases aligned across disconnected local units and a central cloud deployment — the standalone form of the edge\u2194cloud sync pattern used in LACS. Change-log-driven replication with per-device tracking, secure cloud sync over WebSocket/HTTP plus LAN peer discovery via mDNS, conflict detection with pluggable resolution strategies, and a FastAPI dashboard/CLI for status and manual control.",
    highlights: [
      "Change-log replication with per-device tracking and conflict strategies",
      "WebSocket/HTTP cloud transport + mDNS LAN peer discovery",
    ],
    tags: ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "WebSocket", "mDNS"],
    category: ["tools", "realtime"],
    rank: "B",
    year: 2025,
    status: "wip",
    synthesize: true,
    isPrivate: true,
    language: "Python",
  },
  "mediasoup-sfu-calling": {
    title: "mediasoup SFU Calling",
    summary:
      "Group video calling on a mediasoup SFU — NestJS Socket.IO signalling, React client.",
    description:
      "Group video calling built directly on mediasoup: the SFU receives each participant's stream once and forwards it to the others, so a client's upload stays constant as the room grows (unlike a peer-to-peer mesh). A NestJS WebSocket gateway handles signalling — RTP capabilities and transport negotiation over Socket.IO — then media flows over WebRTC to the SFU. React + Tailwind client using mediasoup-client.",
    highlights: [
      "Constant per-client upload as rooms grow (SFU vs mesh)",
      "Workers, routers and transports managed in NestJS services",
    ],
    tags: ["mediasoup", "NestJS", "Socket.IO", "WebRTC", "React", "Tailwind"],
    category: ["realtime"],
    rank: "B",
    year: 2025,
    status: "archived",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "live-kit": {
    title: "LiveKit Calling",
    summary:
      "Browser video calls for up to 10 participants on LiveKit — no accounts, no database.",
    description:
      "A video-calling app on LiveKit for 2\u201310 participants: enter a name and start a call in the browser, with mute, camera toggle and screen sharing. React 18 + Vite + Tailwind with LiveKit React components on the front, a NestJS token/room service on the LiveKit Server SDK behind it, all under Docker Compose — no registration and no database.",
    highlights: ["2\u201310 participants per room, screen share, no sign-up", "LiveKit Server SDK token service in NestJS"],
    tags: ["LiveKit", "React 18", "Vite", "NestJS", "WebRTC", "Docker Compose"],
    category: ["realtime"],
    rank: "B",
    year: 2025,
    status: "archived",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  shareit: {
    title: "LAN Remote Control (Android)",
    summary:
      "Android-to-Android screen mirroring and remote touch over LAN with WebRTC — no servers, no internet.",
    description:
      "A private Android-to-Android remote control app: share one device's screen and control it (tap, swipe, gesture) from another on the same Wi-Fi. Zero-config discovery with Android NSD (mDNS), 6-digit PIN pairing over a local TCP signalling server, hardware-accelerated H.264 mirroring via MediaProjection + WebRTC, touch injection through an AccessibilityService, wake locks for persistent sessions, a floating host-side Stop widget and hard 15-minute session timeouts.",
    highlights: [
      "MediaProjection + WebRTC H.264 mirroring, AccessibilityService touch injection",
      "mDNS discovery + PIN pairing — everything stays on the LAN",
    ],
    tags: ["Android", "Kotlin", "WebRTC", "MediaProjection", "AccessibilityService", "mDNS"],
    category: ["realtime", "tools"],
    rank: "B",
    year: 2025,
    status: "archived",
    synthesize: true,
    isPrivate: true,
    language: "Kotlin",
  },
  "lacs-fleet": {
    title: "LACS Fleet",
    summary:
      "Inventory-as-code + Ansible control plane for the LACS mini-PC fleet — replaces 5 repos and 2 runbooks.",
    description:
      "One repo to deploy and operate the LACS field fleet of mini-PCs: inventory-as-code with a validator, an Ansible control plane with playbooks for provisioning and updates over VPN, offline validate/test targets, and a dependency-free Fleet Control web GUI. Consolidates what used to be five repos, a multi-gigabyte off-repo artifact pile and two disagreeing runbooks into a single authoritative deployment procedure.",
    highlights: [
      "Inventory-as-code (fleet.yml) + validator, Ansible playbooks over VPN",
      "Replaced 5 repos and 2 runbooks with one procedure",
    ],
    credit: "Team \u00b7 ATR / Wisflux",
    tags: ["Ansible", "Python", "YAML Inventory", "Fleet Ops", "systemd", "Make"],
    category: ["tools"],
    rank: "B",
    year: 2026,
    status: "active",
    synthesize: true,
    isPrivate: true,
    language: "Python",
  },
  "x-face-app": {
    title: "X-FACE Mobile",
    summary:
      "Expo/React Native client for LACS: server selection, permission flow, native SOS alerts and ringtones.",
    description:
      "The cross-platform (iOS/Android) mobile client for the LACS / X-FACE disaster-response platform. Loads the bundled web app in a WebView against a selectable Cloud, Local or Custom server instance, manages camera, microphone, location, media and notification permissions, plays native ringtones and SOS alerts, and persists configuration with AsyncStorage.",
    highlights: ["Cloud / Local / Custom server instance selection", "Native alerts, SOS sounds and permission management"],
    credit: "Team \u00b7 ATR / Wisflux",
    tags: ["Expo", "React Native", "WebView", "iOS / Android", "AsyncStorage"],
    category: ["realtime", "product"],
    rank: "B",
    year: 2026,
    status: "live",
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  investment: {
    title: "Investment Tracker",
    description:
      "A Supabase-backed investment tracker with portfolio, ledger and watchlist modules pulling real-time Yahoo Finance quotes into recharts visualizations. Deployed and running.",
    liveUrl: "https://investment-alpha-seven.vercel.app",
    liveLabel: "live",
    tags: ["Next.js", "Supabase", "yahoo-finance2", "Recharts"],
    category: ["fintech"],
    rank: "A",
    year: 2026,
    status: "live",
  },
  trip: {
    title: "Trip Splitter",
    description:
      "A Splitwise-style trip expense splitter — groups track shared spends and instantly see per-person balances (who paid, who owes, the per-head split). Intentionally lightweight with PIN login and a JSON data layer.",
    liveUrl: "https://trip-eight-omega.vercel.app",
    liveLabel: "live",
    tags: ["Next.js", "TypeScript", "JSON store"],
    category: ["tools"],
    rank: "A",
    year: 2026,
    status: "live",
    isPrivate: true,
  },
  "All-In-One": {
    title: "All-In-One",
    description:
      "An offline-first React Native life manager: an AES-encrypted secrets vault, expense and debt tracking, notes, and receipt capture with on-device ML Kit OCR. Hardware-backed key storage; shipped as native builds via EAS.",
    tags: ["React Native", "Expo", "SQLite", "ML Kit OCR", "AES"],
    category: ["tools"],
    rank: "A",
    year: 2026,
    status: "active",
  },
  "ai-agent": {
    title: "AgentSystem",
    description:
      "An autonomous developer-agent platform on a containerized monorepo — a Fastify gateway and a Node \"brain\" worker with BullMQ queues, Qdrant vector memory, and real-time Socket.io log streaming.",
    tags: ["Next.js", "Fastify", "BullMQ", "Qdrant", "Socket.io"],
    category: ["ai"],
    rank: "A",
    year: 2026,
    status: "active",
  },
  "trading-agent": {
    title: "Trading Agent",
    description:
      "An NSE trading AI agent: a from-scratch tool-calling loop where an LLM orchestrates custom Python tools to compute indicators, generate backtested trade setups, and scan the Nifty 50 — wrapped in a Streamlit dashboard.",
    tags: ["Python", "OpenRouter", "Streamlit", "yfinance"],
    category: ["fintech", "ai"],
    rank: "A",
    year: 2026,
    status: "active",
  },
  "swing-trading-system": {
    title: "Swing Screener",
    description:
      "An AI swing-trading platform that screens ~2,300 NSE stocks through a 5-stage pipeline, ranks them with a weighted conviction score, and generates Gemini-powered trade plans with brokerage-accurate P&L.",
    tags: ["Python", "FastAPI", "Gemini", "TradingView"],
    category: ["fintech", "ai"],
    rank: "B",
    year: 2026,
    status: "active",
  },
  "personal-cloud": {
    title: "Personal Cloud",
    description:
      "A full-stack personal cloud storage app — React + Chakra UI front end, NestJS/PostgreSQL backend, AWS S3 storage and JWT auth, with offline-first uploads that queue in IndexedDB and background-sync.",
    tags: ["React", "NestJS", "AWS S3", "JWT", "IndexedDB"],
    category: ["tools"],
    rank: "B",
    year: 2024,
    status: "archived",
  },
  "tailwind-ui-kit": {
    title: "Tailwind UI Kit",
    description:
      "A token-driven React component library (published to npm) shipping precompiled styles so apps need zero Tailwind config — a pnpm monorepo with Storybook, docs and a playground.",
    npmUrl: "https://www.npmjs.com/package/super-tailwind-ui-kit",
    tags: ["React", "Tailwind", "Turborepo", "Storybook", "npm"],
    category: ["tools"],
    rank: "B",
    year: 2026,
    status: "live",
  },
  "trading-bot": {
    title: "Trading Bot",
    description:
      "A modular crypto swing-trading bot (BTC/USDT on Binance) emphasizing zero-lookahead backtesting, structural risk management and a Flask dashboard.",
    tags: ["Python", "CCXT", "Flask", "SQLite"],
    category: ["fintech"],
    rank: "B",
    year: 2026,
    status: "archived",
  },
  "investment-plan": {
    title: "FinPilot",
    description:
      "A deployed personal-finance web app to kick-start your investment journey — plan goals, explore options and track a simple investment roadmap.",
    liveUrl: "https://finpilot.netlify.app",
    liveLabel: "finpilot",
    tags: ["Web App", "Investment Planning", "JavaScript"],
    category: ["fintech"],
    rank: "B",
    year: 2025,
    status: "live",
  },
};

/** Repos never shown as quests (junk, boilerplate, superseded, off-theme). */
export const EXCLUDED = new Set<string>([
  "portfolio",
  "shivamgupta1319",
  "shivamgupta1319.github.io",
  "jarvis",
  "social-app",
  "pseo-test",
  "intraday",
  "Shear-market-analysis",
  "task-manager",
  "letsgo",
  "shivam_shukla",
  "appsmith",
  "file-locator",
  "hugo-cms",
  "dream-trip",
  "personal-bot",
  "glacier-tic-tac-toe-game-moqxyvfo",
  "TripMate",
  "EasyShare",
  // README-only designs (no source) — never cite
  "offline-enterprise-rag",
  "multi-agent-coding-platform",
  "ai-architecture-generator",
  "ai-devops-engineer",
  // unlicensed music source — private use only (see repo README)
  "musafir",
  "musafir-backend",
]);

/** Side quests must be at least this fresh (drops old college/lab repos). */
export const SIDE_QUEST_CUTOFF = "2025-01-01T00:00:00Z";
