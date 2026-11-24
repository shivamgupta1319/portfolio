import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { SITE_URL, SITE_TITLE, SITE_DESC, GOOGLE_SITE_VERIFICATION } from "@/lib/site";
import Analytics from "@/analytics/Analytics";
import { THEME_SCRIPT } from "@/theme/themeScript";
import StoreHydrator from "@/lib/StoreHydrator";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Site pages (v5): Archivo with its width axis for the expanded headline cut. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  applicationName: "shivamOS",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  keywords: [
    "Shivam Gupta",
    "full-stack engineer",
    "software engineer portfolio",
    "AI engineer",
    "RAG",
    "LLM gateway",
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
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: "Shivam Gupta",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    site: "@sg247938",
    creator: "@sg247938",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#141a23" },
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
      className={`${inter.variable} ${archivo.variable} ${jbMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
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
        <Analytics />
      </body>
    </html>
  );
}
