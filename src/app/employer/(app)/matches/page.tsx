import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/repos/chat";
import { getI18n } from "@/lib/i18n/server";
import { ButtonLink, EmptyState, PageTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ConversationInbox } from "@/components/ConversationInbox";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("chat.title") };
}

export default async function EmployerMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await requireRole("employer");
  const { cursor } = await searchParams;
  const [page, { locale, t }] = await Promise.all([
    listConversationsForUser(user.uid, cursor ?? null),
    getI18n(),
  ]);

  return (
    <>
      <PageTitle title={t("chat.title")} subtitle={t("chat.subtitle")} />
      {page.items.length === 0 ? (
        <EmptyState
          icon="chat"
          title={t("chat.noConversations")}
          hint={t("chat.noConversationsEmployer")}
          action={
            <ButtonLink href="/employer/candidates">
              {t("employer.findCandidates")}
            </ButtonLink>
          }
        />
      ) : (
        <ConversationInbox
          conversations={page.items}
          uid={user.uid}
          basePath="/employer/chat"
          viewer="employer"
          locale={locale}
          t={t}
        />
      )}
      {page.nextCursor && (
        <div className="mt-4 text-center">
          <Link
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            href={`?cursor=${encodeURIComponent(page.nextCursor)}`}
          >
            {t("common.loadMore")}
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
