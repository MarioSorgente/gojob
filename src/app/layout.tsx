import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// Typography uses the native system font stack (see globals.css). No webfont
// fetch means no build-time dependency on a font CDN, no render-blocking
// request, and no layout shift — which matters on slow mobile connections.

export const metadata: Metadata = {
  title: "GoJob — Hospitality hiring for Bali",
  description:
    "Post a hospitality job and instantly see the most relevant available candidates in Bali.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
