import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getConversation,
  getMessages,
  listInterviewsForConversation,
} from "@/lib/repos/chat";
import { getT } from "@/lib/i18n/server";
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

  const [messagePage, interviews] = await Promise.all([
    getMessages(conversationId),
    listInterviewsForConversation(conversationId),
  ]);

  const t = await getT();

  return (
    <ChatWorkspace
      backLabel={t("chat.title")}
      backHref="/candidate/matches"
      conversationId={conversationId}
      initialMessages={messagePage.items.toReversed()}
      initialOlderCursor={messagePage.nextCursor}
      interviews={interviews}
      participantName={conv.businessName}
      roleName={conv.jobRole}
      uid={user.uid}
    />
  );
}
