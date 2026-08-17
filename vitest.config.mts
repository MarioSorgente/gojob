import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // `e2e/` holds Playwright specs. They match Vitest's default `*.spec.ts`
    // glob but import `@playwright/test`, which only its own runner provides —
    // so Vitest picked them up and failed to collect them.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The repos guard themselves with `import "server-only"`, whose default
      // entry point throws outside a React Server Component. Point it at the
      // package's own no-op build so those modules can be imported under test.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
