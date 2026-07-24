import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/ThemeProvider";
import { Toaster } from "@/components/Toaster";

// Sans for UI, serif for headings/brand — an editorial pairing that reads as
// considered (law-firm gravitas) rather than default.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "FirmOS — Legal Practice Management",
  description:
    "Case management, court diary, client portal, document automation for Pakistani law firms",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Suspense><Toaster /></Suspense>
      </body>
    </html>
  );
}
