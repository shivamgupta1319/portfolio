import type { CuratedQuest } from "./types";

/**
 * Curated overrides keyed by GitHub repo name. Anything here is deep-merged
 * over the generated GitHub record (curated wins). `featured: true` promotes a
 * repo to a "main quest" with hand-written copy; `synthesize: true` makes it
 * render even when the GitHub fetch didn't return it (private repos in CI).
 */
export const curated: Record<string, CuratedQuest> = {
  // ── S-tier flagships (main quests) ──────────────────────────────
  "lacs-v2": {
    title: "LACS / X-FACE",
    description:
      "A deployed disaster-response communication platform for front-line teams: multimodal voice / video / text comms (Mediasoup WebRTC), on-device ASR/TTS and NLP, push-button SOS and GIS mapping. Built offline-first with bidirectional edge↔cloud PostgreSQL sync so local nodes keep working through intermittent connectivity, plus a cross-platform Expo mobile client and one-touch provisioning for mini-PC field hardware.",
    liveUrl: "https://dr.alwacs.com",
    liveLabel: "live platform",
    credit: "Team · ATR / Wisflux",
    tags: ["Mediasoup / WebRTC", "ASR / TTS", "NLP", "NestJS", "PostgreSQL", "Edge↔Cloud Sync", "Expo", "OpenStreetMap", "Docker / systemd"],
    rank: "S",
    featured: true,
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "programmatic-SEO-engine": {
    title: "pSEO Engine",
    description:
      "A developer-first programmatic-SEO SaaS that generates and quality-gates penalty-resistant landing pages, then ships them into a customer's own Next.js/Astro repo via GitHub PR or a pull-API. Built-in pgvector dedup, thin-content guardrails, a multi-LLM router with failover, self-hosted Better Auth, and Lemon Squeezy billing.",
    liveUrl: "https://pseo.cloud",
    liveLabel: "pseo.cloud",
    tags: ["Next.js 15", "Drizzle", "Postgres + pgvector", "Better Auth", "pg-boss", "Multi-LLM Router", "Lemon Squeezy"],
    rank: "S",
    featured: true,
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  resite: {
    title: "Resite",
    description:
      "An AI résumé platform: build and tailor ATS-optimized résumés, score any résumé against a job description, and publish a personal portfolio to your own subdomain. A NestJS API drives queue-based résumé parsing (PDF/DOCX) and Puppeteer PDF rendering, backed by Postgres for multi-tenant subdomain hosting, with a Next.js 15 app on top.",
    liveUrl: "https://resite.live",
    liveLabel: "resite.live",
    tags: ["Next.js 15", "NestJS", "PostgreSQL + TypeORM", "BullMQ + Redis", "Puppeteer", "ATS Scoring", "Subdomain Portfolios"],
    rank: "S",
    featured: true,
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  "stocksafe-bundles": {
    title: "StockSafe Bundles",
    description:
      "A Shopify app — live on the Shopify App Store — that keeps fixed-bundle inventory trustworthy across locations. A reconcile → diagnose → audit engine computes true per-location sellable quantity, names the bottleneck component when a bundle reads zero, and keeps an append-only audit trail no incumbent has.",
    liveUrl: "https://apps.shopify.com/stocksafe-bundles",
    liveLabel: "Shopify App Store",
    tags: ["Shopify App", "React Router", "Prisma", "Postgres (Neon)", "pg-boss", "Render"],
    rank: "S",
    featured: true,
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  UACE: {
    title: "UACE — Universal AI Context Engine",
    description:
      "A published npm MCP server that gives every AI coding assistant (Claude Code, Cursor, Copilot) one shared, local-first \"Project Brain\" — so a brand-new session continues without re-explaining the codebase. 14+ MCP tools, offline semantic search (sqlite-vec + local embeddings), git ingestion, live file-watch, and a companion VS Code extension.",
    npmUrl: "https://www.npmjs.com/package/uace-mcp",
    tags: ["MCP", "TypeScript", "SQLite + sqlite-vec", "Local Embeddings", "VS Code Extension"],
    rank: "S",
    featured: true,
  },
  "crypto-ai": {
    title: "crypto-ai — Quant Engine",
    description:
      "A crypto-futures research and paper-trading system running 12 long/short strategies through one engine, hardened by walk-forward, Monte-Carlo and out-of-sample robustness testing. Adds a scikit-learn meta-label P(win) filter, regime detection, and a human-in-the-loop self-optimizing agent.",
    tags: ["Python", "FastAPI", "scikit-learn", "React", "Docker", "CI"],
    rank: "S",
    featured: true,
  },
  "smart-trading": {
    title: "SmartTrader",
    description:
      "A polyglot NSE trading platform on an Nx monorepo: backtests 28 documented strategies, streams a live market scanner over WebSockets, and fires Telegram breakout alerts. React + Vite UI, NestJS + Prisma API, and a Python FastAPI quant engine.",
    tags: ["Nx Monorepo", "NestJS", "React", "Python FastAPI", "PostgreSQL", "Socket.io", "Docker"],
    rank: "S",
    featured: true,
  },
  "web-dev-workflow": {
    title: "Glacier Dev",
    description:
      "An autonomous AI web-development platform where specialized Architect, Backend and UI agents take an idea from prompt to a deployed app. Multi-provider LLM orchestration with failover and JSON repair, an in-browser Monaco/Sandpack editor, and one-click GitHub→Vercel deploy on Supabase.",
    tags: ["Next.js 14", "Gemini", "OpenRouter", "Supabase", "Monaco", "Sandpack"],
    rank: "S",
    featured: true,
  },
  "outlook-dashboard": {
    title: "Inbox Agent (MCP)",
    description:
      "A local-first AI mail assistant that unifies multi-account Gmail into a \"needs-reply\" queue and exposes it to Claude through a Model Context Protocol server for summarizing, analyzing and drafting replies. TypeScript monorepo with encrypted token storage and a React dashboard.",
    tags: ["MCP", "TypeScript", "Gmail API", "SQLite", "React"],
    rank: "A",
    featured: true,
  },
  streamverse: {
    title: "StreamVerse",
    description:
      "A published TypeScript SDK that distills WebRTC signaling and connection management into a few lines for video calls, live streaming and screen sharing — with automatic P2P→SFU scaling, a hosted signaling option, and a live multi-user demo.",
    npmUrl: "https://www.npmjs.com/package/streamverse",
    liveUrl: "https://streamverse-delta.vercel.app",
    liveLabel: "live demo",
    tags: ["WebRTC", "Mediasoup SFU", "TypeScript", "npm Package", "Socket.io"],
    rank: "S",
    featured: true,
  },
  "copy-trading": {
    title: "CopyTrade Pro",
    description:
      "An automated crypto-futures platform that ingests trade signals, validates them through LLM risk-checks, and executes on Binance Futures via a custom CCXT layer. Resilient queue-based architecture (NestJS + BullMQ/Redis workers), AES-256-GCM key encryption, and live P&L / Sharpe / win-rate analytics.",
    tags: ["Nx Monorepo", "NestJS", "BullMQ + Redis", "CCXT", "PostgreSQL", "AES-256"],
    rank: "S",
    featured: true,
  },
  "drl-trading": {
    title: "DRL Trading Agent",
    description:
      "A Deep Reinforcement Learning intraday agent (PPO/A2C/SAC via Stable-Baselines3) on a custom Gymnasium environment modeling real NSE costs — STT, GST, slippage, stamp duty. Trains on a risk-adjusted composite reward with drawdown, concentration and overtrading penalties.",
    tags: ["Python", "Stable-Baselines3", "Gymnasium", "PyTorch", "pandas-ta"],
    rank: "S",
    featured: true,
  },
  echo: {
    title: "Echo",
    description:
      "An offline-first, self-hosted PWA messaging platform built for exactly two people — end-to-end encrypted with libsodium and WebRTC P2P voice/video that prioritizes LAN-direct connections. A local-first IndexedDB architecture treats the server as a mere sync target; QR pairing, no accounts, no cloud harvesting.",
    tags: ["PWA", "WebRTC", "libsodium E2E", "IndexedDB", "TypeScript", "Docker"],
    rank: "A",
    featured: true,
  },
  "card-selector": {
    title: "Card Selector",
    description:
      "A local-first AI assistant that scans physical cards with a PaddleOCR/OpenCV computer-vision service, stores details under AES-256 encryption, and uses Gemini to parse offer text and recommend the optimal card for any purchase. Next.js PWA + NestJS backend + FastAPI OCR microservice.",
    tags: ["Next.js", "NestJS", "FastAPI", "PaddleOCR", "Gemini", "AES-256", "PWA"],
    rank: "A",
    featured: true,
  },
  "gibp-project": {
    title: "GIBP",
    description:
      "A production-grade multi-tenant fintech / accounting platform: a NestJS API integrated with the Formance financial ledger for organizations, accounts, bills, vendors and reconciliation, with company and super-admin React portals. Nx monorepo with database migrations, role-based access and full E2E test coverage.",
    credit: "Team · Wisflux",
    tags: ["NestJS", "Formance Ledger", "Nx Monorepo", "React 19", "PostgreSQL / Sequelize", "Playwright"],
    rank: "A",
    featured: true,
    synthesize: true,
    isPrivate: true,
    language: "TypeScript",
  },
  typezap: {
    title: "Typezap / Emmple",
    description:
      "A live ed-tech learning platform (~2 years in production) that blends touch-typing with core subjects through a Read → Answer → Type loop grounded in the neuroscience of learning. Grade-specific content with quizzes that unlock lessons, leaderboards and friend challenges, achievement certificates, and multi-channel delivery over WhatsApp, email and web.",
    liveUrl: "https://emmple.com",
    liveLabel: "emmple.com",
    credit: "Team · Wisflux",
    tags: ["Ed-Tech SaaS", "Gamified Learning", "Touch Typing", "Quizzes & Certificates", "Leaderboards", "WhatsApp"],
    rank: "A",
    featured: true,
    synthesize: true,
    isPrivate: true,
  },

  // ── A-tier side quests (light overrides, surface live links) ─────
  investment: {
    title: "Investment Tracker",
    description:
      "A Supabase-backed investment tracker with portfolio, ledger and watchlist modules pulling real-time Yahoo Finance quotes into recharts visualizations. Deployed and running.",
    liveUrl: "https://investment-alpha-seven.vercel.app",
    liveLabel: "live",
    tags: ["Next.js", "Supabase", "yahoo-finance2", "Recharts"],
    rank: "A",
  },
  trip: {
    title: "Trip Splitter",
    description:
      "A Splitwise-style trip expense splitter — groups track shared spends and instantly see per-person balances (who paid, who owes, the per-head split). Intentionally lightweight with PIN login and a JSON data layer.",
    liveUrl: "https://trip-eight-omega.vercel.app",
    liveLabel: "live",
    tags: ["Next.js", "TypeScript", "JSON store"],
    rank: "A",
    isPrivate: true,
  },
  "All-In-One": {
    title: "All-In-One",
    description:
      "An offline-first React Native life manager: an AES-encrypted secrets vault, expense and debt tracking, notes, and receipt capture with on-device ML Kit OCR. Hardware-backed key storage; shipped as native builds via EAS.",
    tags: ["React Native", "Expo", "SQLite", "ML Kit OCR", "AES"],
    rank: "A",
  },
  "ai-agent": {
    title: "AgentSystem",
    description:
      "An autonomous developer-agent platform on a containerized monorepo — a Fastify gateway and a Node \"brain\" worker with BullMQ queues, Qdrant vector memory, and real-time Socket.io log streaming.",
    tags: ["Next.js", "Fastify", "BullMQ", "Qdrant", "Socket.io"],
    rank: "A",
  },
  "trading-agent": {
    title: "Trading Agent",
    description:
      "An NSE trading AI agent: a from-scratch tool-calling loop where an LLM orchestrates custom Python tools to compute indicators, generate backtested trade setups, and scan the Nifty 50 — wrapped in a Streamlit dashboard.",
    tags: ["Python", "OpenRouter", "Streamlit", "yfinance"],
    rank: "A",
  },
  "swing-trading-system": {
    title: "Swing Screener",
    description:
      "An AI swing-trading platform that screens ~2,300 NSE stocks through a 5-stage pipeline, ranks them with a weighted conviction score, and generates Gemini-powered trade plans with brokerage-accurate P&L.",
    tags: ["Python", "FastAPI", "Gemini", "TradingView"],
    rank: "B",
  },
  "personal-cloud": {
    title: "Personal Cloud",
    description:
      "A full-stack personal cloud storage app — React + Chakra UI front end, NestJS/PostgreSQL backend, AWS S3 storage and JWT auth, with offline-first uploads that queue in IndexedDB and background-sync.",
    tags: ["React", "NestJS", "AWS S3", "JWT", "IndexedDB"],
    rank: "B",
  },
  "tailwind-ui-kit": {
    title: "Tailwind UI Kit",
    description:
      "A token-driven React component library (published to npm) shipping precompiled styles so apps need zero Tailwind config — a pnpm monorepo with Storybook, docs and a playground.",
    npmUrl: "https://www.npmjs.com/package/super-tailwind-ui-kit",
    tags: ["React", "Tailwind", "Turborepo", "Storybook", "npm"],
    rank: "B",
  },
  "trading-bot": {
    title: "Trading Bot",
    description:
      "A modular crypto swing-trading bot (BTC/USDT on Binance) emphasizing zero-lookahead backtesting, structural risk management and a Flask dashboard.",
    tags: ["Python", "CCXT", "Flask", "SQLite"],
    rank: "B",
  },
  "investment-plan": {
    title: "FinPilot",
    description:
      "A deployed personal-finance web app to kick-start your investment journey — plan goals, explore options and track a simple investment roadmap.",
    liveUrl: "https://finpilot.netlify.app",
    liveLabel: "finpilot",
    tags: ["Web App", "Investment Planning", "JavaScript"],
    rank: "B",
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
]);

/** Side quests must be at least this fresh (drops old college/lab repos). */
export const SIDE_QUEST_CUTOFF = "2025-01-01T00:00:00Z";
