import type { Message } from "@/lib/types";

export const MESSAGE_WINDOW_THRESHOLD = 400;
export const MESSAGE_WINDOW_SIZE = 300;

export function compareMessages(a: Message, b: Message) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

export function removeMessage(current: Message[], id: string) {
  return current.filter((message) => message.id !== id);
}

/** Keep a bounded DOM while retaining the complete loaded history in memory. */
export function messageWindow(length: number, requestedStart: number) {
  if (length <= MESSAGE_WINDOW_THRESHOLD) return { start: 0, end: length };
  const start = Math.max(
    0,
    Math.min(requestedStart, length - MESSAGE_WINDOW_SIZE),
  );
  return { start, end: Math.min(length, start + MESSAGE_WINDOW_SIZE) };
}
