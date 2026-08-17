import { describe, expect, it } from "vitest";
import type { Message } from "@/lib/types";
import {
  mergeMessages,
  messageWindow,
  MESSAGE_WINDOW_SIZE,
} from "./messageHistory";

const message = (
  id: string,
  createdAt = "2026-01-01T00:00:00.000Z",
): Message => ({
  id,
  conversationId: "conversation",
  senderId: "sender",
  body: id,
  createdAt,
  readAt: null,
});

describe("message history", () => {
  it("deduplicates listener/server overlap and orders equal timestamps by ID", () => {
    expect(
      mergeMessages([message("b")], [message("a"), message("b")]).map(
        (m) => m.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("does not lose a new arrival when an older page resolves", () => {
    const withArrival = mergeMessages(
      [message("middle")],
      [message("new", "2026-02-01T00:00:00.000Z")],
    );
    expect(
      mergeMessages(withArrival, [
        message("old", "2025-12-01T00:00:00.000Z"),
      ]).map((m) => m.id),
    ).toEqual(["old", "middle", "new"]);
  });

  it("windows conversations containing thousands of retained messages", () => {
    expect(messageWindow(10_000, 9_700)).toEqual({ start: 9_700, end: 10_000 });
    expect(
      messageWindow(10_000, 20_000).end - messageWindow(10_000, 20_000).start,
    ).toBe(MESSAGE_WINDOW_SIZE);
  });
});
