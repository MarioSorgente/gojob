"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { markReadAction, sendMessageAction } from "@/app/_actions/chat";
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(getClientDb(), "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) })),
        );
      },
      // If client-side rules deny (e.g. auth not restored), keep SSR messages.
      () => {},
    );
    markReadAction(conversationId).catch(() => {});
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendMessageAction(conversationId, body);
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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"
          disabled={!text.trim()}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
