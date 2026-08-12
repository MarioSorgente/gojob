import { requireRole } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/repos/chat";
import { ConversationInbox } from "@/components/ConversationInbox";
import { EmptyState, PageTitle } from "@/components/ui";

export default async function EmployerMatchesPage() {
  const user = await requireRole("employer");
  const conversations = await listConversationsForUser(user.uid);

  return (
    <>
      <PageTitle title="Chats" subtitle="Conversations with matched candidates" />
      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No chats yet"
          hint="Invite candidates — when interest is mutual, a chat opens here."
        />
      ) : (
        <ConversationInbox
          conversations={conversations}
          uid={user.uid}
          basePath="/employer/chat"
          viewer="employer"
        />
      )}
    </>
  );
}
