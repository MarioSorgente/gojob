import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getConversation,
  getMessages,
  listInterviewsForConversation,
} from "@/lib/repos/chat";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

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
    <ChatWorkspace
      backHref="/candidate/matches"
      conversationId={conversationId}
      initialMessages={messages}
      interviews={interviews}
      participantName={conv.businessName}
      roleName={conv.jobRole}
      uid={user.uid}
    />
  );
}
