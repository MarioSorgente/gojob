import type { NextConfig } from "next";

/**
 * Note: `npm run build` passes `--webpack`. Turbopack's external-module shim
 * cannot require firebase-admin's ESM-only `jose` dependency inside the Vercel
 * lambda (ERR_REQUIRE_ESM), which 500s every server route that touches Firebase.
 * See docs/ARCHITECTURE.md — "Why the production build uses webpack".
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
