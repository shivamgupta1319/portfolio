import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SITE_URL, SITE_DESC, GOOGLE_SITE_VERIFICATION } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Shivam Gupta — shivamOS",
  description: SITE_DESC,
  applicationName: "shivamOS",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
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
  creator: "Shivam Gupta",
  ...(GOOGLE_SITE_VERIFICATION && {
    verification: { google: GOOGLE_SITE_VERIFICATION },
  }),
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Shivam Gupta — shivamOS",
    description: SITE_DESC,
    siteName: "shivamOS",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivam Gupta — shivamOS",
    description: SITE_DESC,
    site: "@sg247938",
    creator: "@sg247938",
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
