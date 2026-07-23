import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/ThemeProvider";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "FirmOS — Legal Practice Management",
  description:
    "Case management, court diary, client portal, document automation for Pakistani law firms",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
