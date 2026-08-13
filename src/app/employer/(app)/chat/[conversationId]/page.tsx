import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getConversation,
  getMessages,
  listInterviewsForConversation,
} from "@/lib/repos/chat";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { HireButton } from "@/components/employer/HireButton";

export default async function EmployerChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireRole("employer");

  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(user.uid)) notFound();

  const [messages, interviews] = await Promise.all([
    getMessages(conversationId),
    listInterviewsForConversation(conversationId),
  ]);

  return (
    <ChatWorkspace
      backHref="/employer/matches"
      conversationId={conversationId}
      headerAction={
        <HireButton jobId={conv.jobId} candidateId={conv.candidateId} />
      }
      initialMessages={messages}
      interviews={interviews}
      participantName={conv.candidateName}
      roleName={conv.jobRole}
      uid={user.uid}
    />
  );
}
