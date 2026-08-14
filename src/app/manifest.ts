import type { MetadataRoute } from "next";

/**
 * Installable web app manifest. The shell already goes to some trouble over
 * safe-area insets and a bottom bar; this is what lets someone actually keep it
 * on a home screen. Icons are generated from src/app/icon.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoJob — Hospitality hiring for Bali",
    short_name: "GoJob",
    description:
      "Post a hospitality job and instantly see the most relevant available candidates in Bali.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0d9488",
    orientation: "portrait",
  };
}
