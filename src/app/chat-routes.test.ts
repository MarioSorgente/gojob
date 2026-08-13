import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const app = path.resolve(import.meta.dirname);

const chatRoutes = [
  ["candidate", "/candidate/chat/example"],
  ["employer", "/employer/chat/example"],
] as const;

describe("chat route layouts", () => {
  it.each(chatRoutes)(
    "routes %s chat through its (app) layout",
    (role, publicUrl) => {
      const route = path.join(
        app,
        role,
        "(app)",
        "chat",
        "[conversationId]",
        "page.tsx",
      );
      const appLayout = path.join(app, role, "(app)", "layout.tsx");

      expect(existsSync(route)).toBe(true);
      expect(existsSync(appLayout)).toBe(true);
      expect(
        existsSync(
          path.join(app, role, "chat", "[conversationId]", "page.tsx"),
        ),
      ).toBe(false);
      expect(publicUrl).toBe(`/${role}/chat/example`);
    },
  );
});
