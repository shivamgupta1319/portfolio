export const bio: string[] = [
  "Full-Stack Software Engineer with 4+ years shipping products end-to-end — 3 live SaaS products (pSEO.cloud, Resite.live and Stock Safe Bundles on the Shopify App Store) and 2 published npm packages (Stream Verse, uace-mcp) — and core engineer on a deployed disaster-response platform running WebRTC and on-device speech recognition on field hardware with zero internet dependency.",
  "The work I choose keeps landing where AI meets money: a code-intelligence engine measured against labelled ground truth, an OpenAI-compatible LLM gateway serving five of my own products, an LLM-tracing platform, and NSE research tools that cost trades to the paisa and publish their negative results. I build the measurement before the feature, and I ship the product around the model — not just the notebook.",
];

export interface Trait {
  icon: string;
  title: string;
  detail: string;
}

export const traits: Trait[] = [
  {
    icon: "⚙",
    title: "Systems Architecture",
    detail:
      "Polyglot monorepos, Docker, queue-driven workers, offline-first sync, multi-tenant SaaS.",
  },
  {
    icon: "✦",
    title: "AI Engineering",
    detail:
      "RAG + evals, LLM gateways with typed failover, MCP servers, agents, on-device ASR.",
  },
  {
    icon: "₿",
    title: "FinTech & Markets",
    detail:
      "28+ strategies, net-of-cost backtests, IPO/dividend screeners, real-time market news.",
  },
  {
    icon: "◈",
    title: "Real-Time Systems",
    detail: "WebRTC / Mediasoup SFU, FFmpeg, Socket.io, sub-second streaming.",
  },
];
