import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { ChatWindow } from "./ChatWindow";
import { InterviewSection } from "./InterviewSection";
import type { Interview, Message } from "@/lib/types";

export function ChatWorkspace({
  backHref,
  backLabel,
  conversationId,
  headerAction,
  initialMessages,
  initialOlderCursor,
  interviews,
  participantName,
  roleName,
  uid,
}: {
  backHref: string;
  /** Accessible name for the back control, already translated. */
  backLabel: string;
  conversationId: string;
  headerAction?: ReactNode;
  initialMessages: Message[];
  initialOlderCursor: string | null;
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
        {/* A bare "←" glyph in a text node is a ~16px tap target. */}
        <Link
          href={backHref}
          aria-label={backLabel}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Icon name="arrowLeft" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {participantName}
          </p>
          <p className="truncate text-xs text-brand">{roleName}</p>
        </div>
        {headerAction}
      </header>

      {/* Capped lower than the previous 45%: interview cards were taking up
          nearly half the chat viewport on a phone. */}
      <div className="max-h-[32%] shrink-0 overflow-y-auto border-b border-border bg-surface px-4 py-2">
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
          initialOlderCursor={initialOlderCursor}
        />
      </div>
    </section>
  );
}
