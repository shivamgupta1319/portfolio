import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

const SITE = "https://myselfshivam.netlify.app";
const DESC =
  "Shivam Gupta — full-stack software engineer building trading systems, AI agents, real-time apps and shipped SaaS. Explore the portfolio as a bootable game-OS.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Shivam Gupta — shivamOS",
  description: DESC,
  keywords: [
    "Shivam Gupta",
    "full-stack engineer",
    "software engineer portfolio",
    "AI agents",
    "algorithmic trading",
    "Next.js",
    "TypeScript",
    "WebRTC",
    "MCP",
  ],
  authors: [{ name: "Shivam Gupta" }],
  openGraph: {
    type: "website",
    url: SITE,
    title: "Shivam Gupta — shivamOS",
    description: DESC,
    siteName: "shivamOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivam Gupta — shivamOS",
    description: DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
