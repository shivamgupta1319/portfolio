import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(140px 140px at 50% 30%, #1a1b3a 0%, #0a0a0b 70%)",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 92, fontWeight: 800, color: "#34d399" }}>&gt;</span>
          <span style={{ width: 46, height: 9, background: "#22d3ee", borderRadius: 5 }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 22, color: "#818cf8", letterSpacing: 2 }}>
          shivamOS
        </div>
      </div>
    ),
    size,
  );
}
