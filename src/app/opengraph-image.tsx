import { ImageResponse } from "next/og";
import { liveApps } from "@/data/apps";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shivam Gupta: I build products and run them myself.";

/** Share card in the site's operator-board look (docs/design.md). */
export default function OgImage() {
  const rows = liveApps.slice(0, 3);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#141a23",
          color: "#e9edf4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#a9b3c4" }}>Shivam Gupta, Software Engineer</div>
          <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2, lineHeight: 1.04, marginTop: 12, maxWidth: 860 }}>
            I build products and run them myself.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid rgba(214,224,240,0.22)" }}>
          {rows.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid rgba(214,224,240,0.11)",
                fontSize: 28,
              }}
            >
              <div style={{ display: "flex", fontWeight: 700 }}>{a.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#a3b4ff", fontFamily: "monospace" }}>
                {a.host}
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#45d394" }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: "#8d98ab" }}>
            {`${liveApps.length} apps live on my own domains · shivamgupta.live`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
