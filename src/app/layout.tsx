import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
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

/**
 * `viewport-fit=cover` lets the layout reach under the notch and home
 * indicator, which is what makes the `env(safe-area-inset-*)` padding on the
 * bottom bar and sheets meaningful. Zoom is deliberately not disabled.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d9488",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
