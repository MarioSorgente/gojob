"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import { markReadAction, sendMessageAction } from "@/app/_actions/chat";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Message } from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWindow({
  conversationId,
  uid,
  initialMessages,
}: {
  conversationId: string;
  uid: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { show } = useToast();
  const endRef = useRef<HTMLDivElement>(null);

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
          collection(getClientDb(), "conversations", conversationId, "messages"),
          orderBy("createdAt", "asc"),
        );
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            setMessages(
              snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Message, "id">),
              })),
            );
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
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      show("Message not sent. Check your connection and try again.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-1 py-3">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            You matched! Say hello 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === uid;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "rounded-br-sm bg-brand text-white"
                    : "rounded-bl-sm bg-white text-slate-800 shadow-sm",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-slate-400")}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border bg-surface p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="h-11 flex-1 rounded-full border border-border bg-white px-4 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          // Disabling while in flight stops a double-tap sending twice.
          disabled={!text.trim() || sending}
          aria-label="Send"
        >
          {sending ? <Spinner className="border-white" /> : "➤"}
        </button>
      </form>
    </div>
  );
}
