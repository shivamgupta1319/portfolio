import type { SkillGroup, SkillNode, StatBar } from "./types";

/** Character-sheet stat bars, derived from the strongest skill clusters. */
export const stats: StatBar[] = [
  { key: "systems", label: "Systems Architecture", value: 92 },
  { key: "ai", label: "AI Engineering", value: 88 },
  { key: "trading", label: "FinTech & Quant Research", value: 86 },
  { key: "realtime", label: "Real-Time / WebRTC", value: 80 },
];

/**
 * Tech-tree nodes — every entry is backed by the résumés in /public/resume and
 * /public/dhive (verified 2026-09-11). `deps` wire each node to a parent in the
 * same column so the skill tree can draw connector lines. Keep tiers ≤ 2.
 */
export const skills: SkillNode[] = [
  // frontend
  { id: "react", label: "React", group: "frontend", tier: 0, deps: [] },
  { id: "next", label: "Next.js", group: "frontend", tier: 1, deps: ["react"] },
  { id: "ts", label: "TypeScript", group: "frontend", tier: 1, deps: ["react"] },
  { id: "vite", label: "Vite / React Query", group: "frontend", tier: 1, deps: ["react"] },
  { id: "tailwind", label: "Tailwind CSS", group: "frontend", tier: 2, deps: ["next"] },
  { id: "viz", label: "D3 / Recharts", group: "frontend", tier: 2, deps: ["ts"] },
  { id: "pwa", label: "PWA / i18next", group: "frontend", tier: 2, deps: ["vite"] },

  // backend
  { id: "node", label: "Node.js", group: "backend", tier: 0, deps: [] },
  { id: "nest", label: "NestJS", group: "backend", tier: 1, deps: ["node"] },
  { id: "express", label: "Express / Fastify", group: "backend", tier: 1, deps: ["node"] },
  { id: "python", label: "Python", group: "backend", tier: 0, deps: [] },
  { id: "fastapi", label: "FastAPI", group: "backend", tier: 1, deps: ["python"] },
  { id: "api", label: "REST / GraphQL", group: "backend", tier: 2, deps: ["nest"] },
  { id: "sockets", label: "WebSockets / Socket.io", group: "backend", tier: 2, deps: ["express"] },
  { id: "queues", label: "BullMQ / pg-boss", group: "backend", tier: 2, deps: ["nest"] },
  { id: "auth", label: "JWT / OAuth / RBAC / AES-256", group: "backend", tier: 2, deps: ["nest"] },

  // data
  { id: "postgres", label: "PostgreSQL", group: "data", tier: 0, deps: [] },
  { id: "orm", label: "Prisma / Drizzle / TypeORM / Sequelize", group: "data", tier: 1, deps: ["postgres"] },
  { id: "sql", label: "MySQL / SQLite", group: "data", tier: 1, deps: ["postgres"] },
  { id: "redis", label: "Redis", group: "data", tier: 1, deps: ["postgres"] },
  { id: "vector", label: "pgvector / sqlite-vec / Qdrant", group: "data", tier: 2, deps: ["orm"] },

  // infra
  { id: "docker", label: "Docker / Compose", group: "infra", tier: 0, deps: [] },
  { id: "mono", label: "Nx / Turborepo", group: "infra", tier: 1, deps: ["docker"] },
  { id: "cicd", label: "CI/CD (GitHub Actions)", group: "infra", tier: 1, deps: ["docker"] },
  { id: "edge", label: "systemd / Edge Deploy", group: "infra", tier: 1, deps: ["docker"] },
  { id: "aws", label: "AWS / Nginx", group: "infra", tier: 2, deps: ["cicd"] },
  { id: "hosting", label: "Netlify / Vercel / Render", group: "infra", tier: 2, deps: ["cicd"] },

  // specialties
  { id: "llm", label: "LLM Orchestration", group: "specialty", tier: 0, deps: [] },
  { id: "rag", label: "RAG / Hybrid Search / Evals", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "gateway", label: "LLM Gateways / Failover", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "mcp", label: "MCP Servers", group: "specialty", tier: 1, deps: ["llm"] },
  { id: "webrtc", label: "WebRTC / Mediasoup SFU", group: "specialty", tier: 0, deps: [] },
  { id: "media", label: "FFmpeg / RTSP / RTMP", group: "specialty", tier: 1, deps: ["webrtc"] },
  { id: "asr", label: "ASR / TTS", group: "specialty", tier: 1, deps: ["webrtc"] },
  { id: "cv", label: "Computer Vision (OpenCV / PaddleOCR / YOLO)", group: "specialty", tier: 0, deps: [] },
  { id: "expo", label: "React Native / Expo", group: "specialty", tier: 0, deps: [] },
  { id: "gis", label: "GIS / OpenStreetMap", group: "specialty", tier: 0, deps: [] },
  { id: "quant", label: "Backtesting / Algo Trading", group: "specialty", tier: 0, deps: [] },
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
