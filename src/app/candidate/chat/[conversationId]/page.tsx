import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getConversation,
  getMessages,
  listInterviewsForConversation,
} from "@/lib/repos/chat";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InterviewSection } from "@/components/chat/InterviewSection";

export default async function CandidateChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireRole("candidate");

  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(user.uid)) notFound();

  const [messages, interviews] = await Promise.all([
    getMessages(conversationId),
    listInterviewsForConversation(conversationId),
  ]);

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link href="/candidate/matches" className="text-muted">
          ←
        </Link>
        <div>
          <p className="font-semibold leading-tight">{conv.businessName}</p>
          <p className="text-xs text-brand">{conv.jobRole}</p>
        </div>
      </header>

      <div className="border-b border-border bg-surface px-4 py-2">
        <InterviewSection
          conversationId={conversationId}
          uid={user.uid}
          interviews={interviews}
        />
      </div>

      <div className="min-h-0 flex-1 px-3">
        <ChatWindow
          conversationId={conversationId}
          uid={user.uid}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
