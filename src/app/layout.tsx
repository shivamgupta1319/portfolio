import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SITE_URL, SITE_DESC, GOOGLE_SITE_VERIFICATION } from "@/lib/site";
import { THEME_SCRIPT } from "@/theme/themeScript";
import StoreHydrator from "@/lib/StoreHydrator";
import Toasts from "@/hud/Toasts";
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
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme is set by THEME_SCRIPT before paint, never by React →
    // suppress the attribute-mismatch warning on <html>.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jbMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <noscript>
          <p className="border-b border-border bg-bg-2 px-4 py-2 text-center font-mono text-xs text-fg-dim">
            This page works without JavaScript. Desktop mode (the interactive OS)
            needs it enabled.
          </p>
        </noscript>
        <StoreHydrator />
        {children}
        <Toasts />
      </body>
    </html>
  );
}
