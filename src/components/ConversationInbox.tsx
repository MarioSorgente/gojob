import Link from "next/link";
import type { Conversation } from "@/lib/types";
import { Avatar } from "./ui";

export function ConversationInbox({
  conversations,
  uid,
  basePath,
  viewer,
}: {
  conversations: Conversation[];
  uid: string;
  basePath: string;
  viewer: "candidate" | "employer";
}) {
  return (
    <div className="space-y-2">
      {conversations.map((c) => {
        const title = viewer === "candidate" ? c.businessName : c.candidateName;
        const unread = c.unread?.[uid] ?? 0;
        return (
          <Link
            key={c.id}
            href={`${basePath}/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-slate-50"
          >
            <Avatar name={title} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{title}</p>
                {unread > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-brand">{c.jobRole}</p>
              <p className="truncate text-sm text-muted">
                {c.lastMessage ?? "Say hello 👋"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
