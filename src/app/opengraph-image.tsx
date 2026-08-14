import { ImageResponse } from "next/og";

/**
 * Default social card. Job pages inherit it, so a link pasted into Instagram or
 * WhatsApp — the acquisition path in scope §20 — shows GoJob branding rather
 * than a blank preview.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GoJob — Hospitality hiring for Bali";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f766e",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800 }}>
          <span style={{ color: "#5eead4" }}>Go</span>
          <span>Job</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Hospitality hiring for Bali
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Post a role · Meet matched candidates the same day
        </div>
      </div>
    ),
    size,
  );
}
