import { requireRole } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/repos/chat";
import { ConversationInbox } from "@/components/ConversationInbox";
import { EmptyState, PageTitle } from "@/components/ui";
import Link from "next/link";

export default async function EmployerMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await requireRole("employer");
  const { cursor } = await searchParams;
  const page = await listConversationsForUser(user.uid, cursor ?? null);

  return (
    <>
      <PageTitle
        title="Chats"
        subtitle="Conversations with matched candidates"
      />
      {page.items.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No chats yet"
          hint="Invite candidates — when interest is mutual, a chat opens here."
        />
      ) : (
        <ConversationInbox
          conversations={page.items}
          uid={user.uid}
          basePath="/employer/chat"
          viewer="employer"
        />
      )}
      {page.nextCursor && (
        <div className="mt-4 text-center">
          <Link
            className="text-sm font-semibold text-brand"
            href={`?cursor=${encodeURIComponent(page.nextCursor)}`}
          >
            Older conversations →
          </Link>
        </div>
      )}
    </>
  );
}
