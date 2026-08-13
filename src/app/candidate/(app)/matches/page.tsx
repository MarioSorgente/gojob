import { requireRole } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/repos/chat";
import { EmptyState, PageTitle } from "@/components/ui";
import { ConversationInbox } from "@/components/ConversationInbox";
import Link from "next/link";

export default async function CandidateMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await requireRole("candidate");
  const { cursor } = await searchParams;
  const page = await listConversationsForUser(user.uid, cursor ?? null);

  return (
    <>
      <PageTitle
        title="Chats"
        subtitle="Your matches — chat opens on mutual interest"
      />
      {page.items.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No matches yet"
          hint="When you and an employer both show interest, a chat opens here."
        />
      ) : (
        <ConversationInbox
          conversations={page.items}
          uid={user.uid}
          basePath="/candidate/chat"
          viewer="candidate"
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
