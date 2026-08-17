"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  documentId,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import {
  loadOlderMessagesAction,
  markReadAction,
  sendMessageAction,
} from "@/app/_actions/chat";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/lib/i18n/client";
import { dayKey, formatDayLabel, formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";
import type { Message } from "@/lib/types";
import {
  mergeMessages,
  messageWindow,
  MESSAGE_WINDOW_SIZE,
  removeMessage,
} from "./messageHistory";

/**
 * Group consecutive messages into day buckets, and mark the ones that continue
 * the previous sender so a run of replies reads as one block instead of a
 * stack of identical bubbles.
 */
function groupByDay(messages: Message[], locale: Locale) {
  const days: {
    key: string;
    iso: string;
    items: (Message & { continues: boolean })[];
  }[] = [];
  for (const message of messages) {
    const key = dayKey(message.createdAt, locale);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, iso: message.createdAt, items: [] };
      days.push(day);
    }
    const previous = day.items[day.items.length - 1];
    day.items.push({
      ...message,
      continues: previous?.senderId === message.senderId,
    });
  }
  return days;
}

export function ChatWindow({
  conversationId,
  uid,
  initialMessages,
  initialOlderCursor,
}: {
  conversationId: string;
  uid: string;
  initialMessages: Message[];
  initialOlderCursor: string | null;
}) {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [olderCursor, setOlderCursor] = useState(initialOlderCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [windowStart, setWindowStart] = useState(() =>
    Math.max(0, initialMessages.length - MESSAGE_WINDOW_SIZE),
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { show } = useToast();
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const newestMessageId = messages.at(-1)?.id;
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // A server session can render this page before Firebase has restored the
    // browser session. Subscribing during that window gets permission-denied,
    // and Firestore does not retry a failed listener when auth finishes. Wait
    // for the initial auth state so candidate chats remain live after reloads.
    void getClientAuth()
      .authStateReady()
      .then(() => {
        if (cancelled) return;
        const q = query(
          collection(
            getClientDb(),
            "conversations",
            conversationId,
            "messages",
          ),
          // A bounded newest-page listener avoids re-reading a long thread. It
          // deliberately overlaps SSR; ID-based merging makes that race safe.
          orderBy("createdAt", "desc"),
          orderBy(documentId(), "desc"),
          limit(50),
        );
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            for (const change of snap.docChanges()) {
              const message = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Message, "id">),
              };
              setMessages((current) =>
                change.type === "removed"
                  ? removeMessage(current, message.id)
                  : mergeMessages(current, [message]),
              );
            }
          },
          // Keep server-rendered messages when the browser has no Firebase
          // session (for example, after its local persistence was cleared).
          () => {},
        );
      })
      .catch(() => {});

    markReadAction(conversationId).catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [conversationId]);

  useEffect(() => {
    // Honour the OS motion preference — an auto-scrolling chat is exactly the
    // kind of movement `prefers-reduced-motion` exists for.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [newestMessageId]);

  const bounds = messageWindow(messages.length, windowStart);
  const visibleMessages = messages.slice(bounds.start, bounds.end);
  const days = useMemo(
    () => groupByDay(visibleMessages, locale),
    [visibleMessages, locale],
  );

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const container = scrollRef.current;
    const priorHeight = container?.scrollHeight ?? 0;
    try {
      const page = await loadOlderMessagesAction(conversationId, olderCursor);
      setMessages((current) => mergeMessages(current, page.items));
      setOlderCursor(page.nextCursor);
      setWindowStart(0);
      requestAnimationFrame(() => {
        if (container)
          container.scrollTop += container.scrollHeight - priorHeight;
      });
    } catch {
      show(t("chat.loadOlderFailed"), "error");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    // Clear optimistically so the input feels instant, but restore the text if
    // the send fails — previously a failure silently ate the message, because
    // the input was cleared before the await and nothing caught the error.
    setSending(true);
    setText("");
    try {
      const res = await sendMessageAction(conversationId, body);
      if (res.error) {
        setText(body);
        show(res.error, "error");
      } else if (res.message) {
        const message = res.message;
        // Do not depend on the client listener to echo our own successful
        // write: it may be unavailable when only the server session survives.
        setMessages((current) =>
          current.some(({ id }) => id === message.id)
            ? current
            : [...current, message],
        );
      }
    } catch {
      setText(body);
      show(t("chat.sendFailed"), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        // `justify-end` on a flex column pins a short thread to the bottom;
        // once it overflows, `overflow-y-auto` takes over and it scrolls
        // normally. Top-aligned messages left a wall of empty space below.
        className="flex flex-1 flex-col justify-end space-y-2 overflow-y-auto px-1 py-3"
        role="log"
        aria-live="polite"
        aria-label={t("chat.messages")}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (messages.length <= 400) return;
          if (element.scrollTop < 80 && bounds.start > 0)
            setWindowStart(Math.max(0, bounds.start - 150));
          if (
            element.scrollHeight - element.scrollTop - element.clientHeight <
              80 &&
            bounds.end < messages.length
          )
            setWindowStart(
              Math.min(
                messages.length - MESSAGE_WINDOW_SIZE,
                bounds.start + 150,
              ),
            );
        }}
      >
        {olderCursor && bounds.start === 0 && (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
            className="mx-auto my-2 block rounded-full border border-border px-4 py-2 text-xs font-semibold text-brand disabled:opacity-50"
          >
            {loadingOlder ? <Spinner /> : t("chat.loadOlder")}
          </button>
        )}
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            {t("chat.matchHint")}
          </p>
        )}

        {days.map((day) => (
          <div key={day.key} className="space-y-1">
            <p className="sticky top-0 z-10 my-3 text-center">
              <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-semibold text-muted">
                {formatDayLabel(day.iso, locale)}
              </span>
            </p>
            {day.items.map((m) => {
              const mine = m.senderId === uid;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    mine ? "justify-end" : "justify-start",
                    m.continues ? "mt-0.5" : "mt-2",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-panel px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-surface text-foreground shadow-card",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] tabular-nums",
                        mine ? "text-white/70" : "text-muted",
                      )}
                    >
                      {formatTime(m.createdAt, locale)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border bg-surface p-3"
      >
        <label htmlFor="chat-message" className="sr-only">
          {t("chat.messageLabel")}
        </label>
        <input
          id="chat-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("chat.messagePlaceholder")}
          autoComplete="off"
          className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          // Disabling while in flight stops a double-tap sending twice.
          disabled={!text.trim() || sending}
          aria-label={t("chat.send")}
        >
          {sending ? (
            <Spinner className="border-white" />
          ) : (
            <Icon name="send" className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
}
