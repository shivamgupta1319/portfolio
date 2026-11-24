import { liveApps } from "./apps";
export const bio: string[] = [
  `Full-stack software engineer with 4+ years shipping products end to end. ${liveApps.length} of my apps are live on my own domains, served from a server I run myself (pSEO.cloud, Resite.live, Trade Master, Repo Intelligence and AI Router among them), plus 2 published npm packages (Stream Verse, uace-mcp). At work I'm a core engineer on a deployed disaster-response platform running WebRTC and on-device speech recognition on field hardware with zero internet dependency.`,
  "The work I choose keeps landing where AI meets money: a code-intelligence engine measured against labelled ground truth, an OpenAI-compatible gateway serving my own products, and NSE research tools that cost trades to the paisa and publish their negative results. I build the measurement before the feature, and I ship the product around the model, not just the notebook.",
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
      "31 backtested strategies, event studies, IPO and dividend screeners, real-time market news.",
  },
  {
    icon: "◈",
    title: "Real-Time Systems",
    detail: "WebRTC / Mediasoup SFU, FFmpeg, Socket.io, sub-second streaming.",
  },
];
