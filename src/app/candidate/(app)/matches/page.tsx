import { requireRole } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/repos/chat";
import { EmptyState, PageTitle } from "@/components/ui";
import { ConversationInbox } from "@/components/ConversationInbox";

export default async function CandidateMatchesPage() {
  const user = await requireRole("candidate");
  const conversations = await listConversationsForUser(user.uid);

  return (
    <>
      <PageTitle title="Chats" subtitle="Your matches — chat opens on mutual interest" />
      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No matches yet"
          hint="When you and an employer both show interest, a chat opens here."
        />
      ) : (
        <ConversationInbox
          conversations={conversations}
          uid={user.uid}
          basePath="/candidate/chat"
          viewer="candidate"
        />
      )}
    </>
  );
}
