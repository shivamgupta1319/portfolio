import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The SG monogram from icon.svg, full-bleed for the home screen (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#7b3770" }}>
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <g stroke="#f4f7f3" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.2 11.2c-.5-1.5-1.8-2.4-3.5-2.4-2 0-3.4 1.1-3.4 2.7 0 3.9 7.1 2.4 7.1 6.6 0 1.8-1.5 3.1-3.7 3.1-1.9 0-3.3-.9-3.8-2.5" />
            <path d="M25.6 11.4c-.7-1.6-2.1-2.6-3.8-2.6-2.6 0-4.4 2.3-4.4 6.4s1.8 6.4 4.4 6.4c2.3 0 3.9-1.6 3.9-4.2v-.6h-3.6" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
