import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shivam Gupta — Full-Stack Engineer · AI & FinTech systems";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(1000px 600px at 20% 10%, #1a1b3a 0%, #0a0a0b 55%)",
          color: "#f5f5f7",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#818cf8", fontSize: 30 }}>
          [ shivamgupta.live ]
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, marginTop: 24, letterSpacing: -2 }}>
          Shivam Gupta
        </div>
        <div style={{ fontSize: 40, color: "#a1a1a8", marginTop: 8 }}>
          Full-Stack Engineer · AI &amp; FinTech systems
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
          {["3 live SaaS products", "2 npm packages", "AI · FinTech · Real-time"].map((t) => (
            <div
              key={t}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                padding: "10px 20px",
                fontSize: 26,
                color: "#22d3ee",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 56, fontSize: 26, color: "#34d399" }}>
          guest@shivamos:~$ open projects --featured _
        </div>
      </div>
    ),
    size,
  );
}
