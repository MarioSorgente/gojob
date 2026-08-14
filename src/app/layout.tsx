import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n/client";
import { clientSlice } from "@/lib/i18n/dictionary";
import { getDict, getLocale } from "@/lib/i18n/server";
import "./globals.css";

// Typography uses the native system font stack (see globals.css). No webfont
// fetch means no build-time dependency on a font CDN, no render-blocking
// request, and no layout shift — which matters on slow mobile connections.

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gojob.vercel.app",
  ),
  title: {
    default: "GoJob — Hospitality hiring for Bali",
    template: "%s — GoJob",
  },
  description:
    "Post a hospitality job and instantly see the most relevant available candidates in Bali.",
  applicationName: "GoJob",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "GoJob",
    title: "GoJob — Hospitality hiring for Bali",
    description:
      "Post a hospitality job and instantly see the most relevant available candidates in Bali.",
  },
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Resolved once, here. Server components read the locale directly via
  // getLocale(); the provider carries only the namespaces client components
  // need, so the RSC payload stays small.
  const locale = await getLocale();
  const dict = await getDict();

  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full">
        <I18nProvider locale={locale} dict={clientSlice(dict)}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
