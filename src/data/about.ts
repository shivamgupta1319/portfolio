export const bio: string[] = [
  "Over 4+ years I've evolved from building web apps to architecting complex systems — finance platforms, autonomous AI agents, and real-time communication tools.",
  "I gravitate to hard problems at the intersection of systems, AI and money: algorithmic trading engines, LLM-driven agents, and low-latency real-time infrastructure — and I ship them, from local prototypes to products live on the web.",
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
    detail: "Polyglot monorepos, Docker, microservices, queue-driven workers.",
  },
  {
    icon: "✦",
    title: "AI & Automation",
    detail: "Agents, LLM routers, MCP servers, vector memory, TTS/STT.",
  },
  {
    icon: "₿",
    title: "FinTech & Trading",
    detail: "28+ strategies, backtesting, ML meta-labeling, live alerts.",
  },
  {
    icon: "◈",
    title: "Real-Time Systems",
    detail: "WebRTC, Mediasoup, Socket.io, sub-second streaming.",
  },
];
