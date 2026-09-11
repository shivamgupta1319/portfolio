import type { SkillGroup, SkillNode, StatBar } from "./types";

/** Character-sheet stat bars, derived from the strongest skill clusters. */
export const stats: StatBar[] = [
  { key: "systems", label: "Systems Architecture", value: 92 },
  { key: "ai", label: "AI Engineering", value: 88 },
  { key: "trading", label: "FinTech & Quant Research", value: 86 },
  { key: "realtime", label: "Real-Time / WebRTC", value: 80 },
];

/**
 * Tech-tree nodes. `deps` wire each node to a parent in the same column so the
 * skill tree can draw connector lines. Keep tiers ≤ 2 so the tree stays legible.
 */
export const skills: SkillNode[] = [
  // frontend
  { id: "react", label: "React", group: "frontend", tier: 0, deps: [] },
  { id: "next", label: "Next.js", group: "frontend", tier: 1, deps: ["react"] },
  { id: "ts", label: "TypeScript", group: "frontend", tier: 1, deps: ["react"] },
  { id: "tailwind", label: "Tailwind", group: "frontend", tier: 2, deps: ["next"] },
  { id: "viz", label: "D3 / Recharts", group: "frontend", tier: 2, deps: ["ts"] },
  { id: "maps", label: "MapLibre GL", group: "frontend", tier: 2, deps: ["ts"] },

  // backend
  { id: "node", label: "Node.js", group: "backend", tier: 0, deps: [] },
  { id: "nest", label: "NestJS", group: "backend", tier: 1, deps: ["node"] },
  { id: "fastify", label: "Fastify", group: "backend", tier: 1, deps: ["node"] },
  { id: "python", label: "Python", group: "backend", tier: 0, deps: [] },
  { id: "fastapi", label: "FastAPI", group: "backend", tier: 1, deps: ["python"] },
  { id: "queues", label: "BullMQ / pg-boss", group: "backend", tier: 2, deps: ["nest"] },

  // data
  { id: "postgres", label: "PostgreSQL", group: "data", tier: 0, deps: [] },
  { id: "prisma", label: "Prisma / Drizzle / Kysely", group: "data", tier: 1, deps: ["postgres"] },
  { id: "postgis", label: "PostGIS / PMTiles", group: "data", tier: 1, deps: ["postgres"] },
  { id: "redis", label: "Redis / Valkey", group: "data", tier: 1, deps: ["postgres"] },
  { id: "clickhouse", label: "ClickHouse", group: "data", tier: 2, deps: ["redis"] },
  { id: "vector", label: "pgvector / sqlite-vec / Qdrant", group: "data", tier: 2, deps: ["prisma"] },
  { id: "duckdb", label: "DuckDB / Parquet", group: "data", tier: 2, deps: ["postgis"] },

  // infra
  { id: "docker", label: "Docker", group: "infra", tier: 0, deps: [] },
  { id: "mono", label: "Nx / Turborepo / pnpm", group: "infra", tier: 1, deps: ["docker"] },
  { id: "cicd", label: "CI/CD", group: "infra", tier: 1, deps: ["docker"] },
  { id: "edge", label: "Systemd / Edge Deploy", group: "infra", tier: 1, deps: ["docker"] },
  { id: "ansible", label: "Ansible Provisioning", group: "infra", tier: 2, deps: ["edge"] },
  { id: "aws", label: "AWS S3 / Nginx", group: "infra", tier: 2, deps: ["cicd"] },

  // specialties
  { id: "llm", label: "LLM Orchestration", group: "specialty", tier: 0, deps: [] },
  { id: "rag", label: "RAG / Hybrid Search / Evals", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "gateway", label: "LLM Gateways / Failover", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "mcp", label: "MCP Servers", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "tracing", label: "LLM Observability", group: "specialty", tier: 2, deps: ["gateway"] },
  { id: "webrtc", label: "WebRTC / Mediasoup", group: "specialty", tier: 0, deps: [] },
  { id: "asr", label: "ASR / TTS (Whisper)", group: "specialty", tier: 1, deps: ["webrtc"] },
  { id: "cv", label: "Computer Vision (OCR / YOLO)", group: "specialty", tier: 0, deps: [] },
  { id: "expo", label: "React Native / Expo", group: "specialty", tier: 0, deps: [] },
  { id: "gis", label: "GIS / OpenStreetMap", group: "specialty", tier: 0, deps: [] },
  { id: "quant", label: "Backtesting / Cost Models", group: "specialty", tier: 0, deps: [] },
];

export const SKILL_GROUP_LABELS: Record<SkillGroup, string> = {
  frontend: "Frontend",
  backend: "Backend",
  data: "Data",
  infra: "Infra & DevOps",
  specialty: "Specialties",
};

export const SKILL_GROUP_ORDER: SkillGroup[] = [
  "frontend",
  "backend",
  "data",
  "infra",
  "specialty",
];

/** Grouped + tier-sorted view for the profile page's skills grid. */
export const skillsByGroup: Record<SkillGroup, SkillNode[]> = Object.fromEntries(
  SKILL_GROUP_ORDER.map((g) => [
    g,
    skills.filter((n) => n.group === g).sort((a, b) => a.tier - b.tier),
  ]),
) as Record<SkillGroup, SkillNode[]>;
