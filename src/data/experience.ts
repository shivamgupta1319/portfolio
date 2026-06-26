import type { ExperienceEntry } from "./types";

export const experience: ExperienceEntry[] = [
  {
    role: "Full-Stack Software Engineer",
    org: "Wisflux Tech Labs",
    location: "Jaipur, India",
    start: "Jun 2022",
    end: "Present",
    kind: "work",
    highlight: true,
    bullets: [
      "Engineered multi-service applications with React, TypeScript, NestJS and PostgreSQL.",
      "Architected modular backends with JWT, RBAC and API versioning — cut latency ~30%.",
      "Built FLOS, a disaster-response comms tool (Mediasoup, WebSockets, real-time ASR).",
      "Dockerized dev environments and streamlined CI/CD across services.",
    ],
  },
  {
    role: "Represented Wisflux — ATR Open House 2025",
    org: "Advanced Telecommunications Research Institute",
    location: "Kyoto, Japan",
    start: "2025",
    end: "2025",
    kind: "milestone",
    bullets: [
      "Selected to represent the company internationally at ATR Open House, Kyoto.",
    ],
  },
  {
    role: "B.Tech, Computer Science Engineering",
    org: "Anand International College of Engineering",
    location: "Jaipur, India",
    start: "2019",
    end: "2023",
    kind: "education",
    bullets: ["CGPA 8.5 — Batch of 2019–2023."],
  },
];
