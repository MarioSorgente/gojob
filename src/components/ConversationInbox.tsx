import Link from "next/link";
import type { Conversation } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import { roleLabel } from "@/lib/i18n/taxonomy";
import { Avatar } from "./ui";

export function ConversationInbox({
  conversations,
  uid,
  basePath,
  viewer,
  locale,
  t,
}: {
  conversations: Conversation[];
  uid: string;
  basePath: string;
  viewer: "candidate" | "employer";
  locale: Locale;
  t: Translate;
}) {
  return (
    <ul className="space-y-2">
      {conversations.map((c) => {
        const title = viewer === "candidate" ? c.businessName : c.candidateName;
        const unread = c.unread?.[uid] ?? 0;
        return (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Avatar name={title} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold">{title}</p>
                  <span className="shrink-0 text-xs text-muted">
                    {formatRelativeTime(c.lastMessageAt ?? c.createdAt, locale)}
                  </span>
                </div>
                <p className="truncate text-xs text-brand">
                  {roleLabel(c.jobRole, locale)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-muted">
                    {c.lastMessage ?? t("chat.messagePlaceholder")}
                  </p>
                  {unread > 0 && (
                    <span
                      className="shrink-0 rounded-full bg-accent px-1.5 text-[11px] font-bold tabular-nums text-white"
                      aria-label={t("chat.newMessages")}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
