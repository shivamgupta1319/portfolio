import type { SkillNode, StatBar } from "./types";

/** Character-sheet stat bars, derived from the strongest skill clusters. */
export const stats: StatBar[] = [
  { key: "systems", label: "Systems Architecture", value: 92 },
  { key: "ai", label: "AI & Agents", value: 86 },
  { key: "trading", label: "Algorithmic Trading", value: 84 },
  { key: "realtime", label: "Real-Time / WebRTC", value: 80 },
];

/**
 * Tech-tree nodes. `deps` wire each node to a parent in the same column so the
 * skill tree can draw connector lines (rendered in Phase 6).
 */
export const skills: SkillNode[] = [
  // frontend
  { id: "react", label: "React", group: "frontend", tier: 0, deps: [] },
  { id: "next", label: "Next.js", group: "frontend", tier: 1, deps: ["react"] },
  { id: "ts", label: "TypeScript", group: "frontend", tier: 1, deps: ["react"] },
  { id: "tailwind", label: "Tailwind", group: "frontend", tier: 2, deps: ["next"] },
  { id: "viz", label: "D3 / Recharts", group: "frontend", tier: 2, deps: ["ts"] },

  // backend
  { id: "node", label: "Node.js", group: "backend", tier: 0, deps: [] },
  { id: "nest", label: "NestJS", group: "backend", tier: 1, deps: ["node"] },
  { id: "fastify", label: "Fastify", group: "backend", tier: 1, deps: ["node"] },
  { id: "python", label: "Python", group: "backend", tier: 0, deps: [] },
  { id: "fastapi", label: "FastAPI", group: "backend", tier: 1, deps: ["python"] },
  { id: "queues", label: "BullMQ / pg-boss", group: "backend", tier: 2, deps: ["nest"] },

  // data
  { id: "postgres", label: "PostgreSQL", group: "data", tier: 0, deps: [] },
  { id: "prisma", label: "Prisma / Drizzle", group: "data", tier: 1, deps: ["postgres"] },
  { id: "redis", label: "Redis", group: "data", tier: 1, deps: ["postgres"] },
  { id: "vector", label: "pgvector / Qdrant", group: "data", tier: 2, deps: ["prisma"] },

  // infra
  { id: "docker", label: "Docker", group: "infra", tier: 0, deps: [] },
  { id: "mono", label: "Nx / Turborepo", group: "infra", tier: 1, deps: ["docker"] },
  { id: "cicd", label: "CI/CD", group: "infra", tier: 1, deps: ["docker"] },

  // specialties
  { id: "llm", label: "LLM Orchestration", group: "specialty", tier: 0, deps: [] },
  { id: "mcp", label: "MCP Servers", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "webrtc", label: "WebRTC / Mediasoup", group: "specialty", tier: 0, deps: [] },
  { id: "tauri", label: "Tauri + Rust", group: "specialty", tier: 0, deps: [] },
  { id: "quant", label: "Algo Trading / pandas-ta", group: "specialty", tier: 0, deps: [] },
];

export const SKILL_GROUP_LABELS: Record<SkillNode["group"], string> = {
  frontend: "Frontend",
  backend: "Backend",
  data: "Data",
  infra: "Infra & DevOps",
  specialty: "Specialties",
};
