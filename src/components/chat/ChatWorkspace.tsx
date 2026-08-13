import Link from "next/link";
import type { ReactNode } from "react";
import { ChatWindow } from "./ChatWindow";
import { InterviewSection } from "./InterviewSection";
import type { Interview, Message } from "@/lib/types";

export function ChatWorkspace({
  backHref,
  conversationId,
  headerAction,
  initialMessages,
  interviews,
  participantName,
  roleName,
  uid,
}: {
  backHref: string;
  conversationId: string;
  headerAction?: ReactNode;
  initialMessages: Message[];
  interviews: Interview[];
  participantName: string;
  roleName: string;
  uid: string;
}) {
  return (
    <section
      data-chat-workspace
      className="chat-workspace flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link href={backHref} className="text-muted" aria-label="Back to chats">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {participantName}
          </p>
          <p className="truncate text-xs text-brand">{roleName}</p>
        </div>
        {headerAction}
      </header>

      <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-border bg-surface px-4 py-2">
        <InterviewSection
          conversationId={conversationId}
          uid={uid}
          interviews={interviews}
        />
      </div>

      <div className="min-h-0 flex-1 px-3">
        <ChatWindow
          conversationId={conversationId}
          uid={uid}
          initialMessages={initialMessages}
        />
      </div>
    </section>
  );
}
