import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site so it can deploy to Netlify (or anywhere) with no server.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
