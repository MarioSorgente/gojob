import { ImageResponse } from "next/og";

/** Home-screen / PWA icon. Generated so there is no binary asset to keep in sync. */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d9488",
          color: "#ffffff",
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        Go
      </div>
    ),
    size,
  );
}
