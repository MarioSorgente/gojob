import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCandidateInvitations } from "@/lib/repos/pipeline";
import { countUnreadForUser } from "@/lib/repos/chat";
import { AppShell } from "@/components/AppShell";
import type { NavItem } from "@/components/navigation";
import { getT } from "@/lib/i18n/server";

export default async function CandidateAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("candidate");
  if (!user.onboardingComplete) redirect("/candidate/onboarding");

  // Badge counts must never take the shell down with them: a failure here used
  // to throw from the layout, which 500'd every page underneath it. A missing
  // badge is a far better outcome than an unusable app.
  const [invites, unread] = await Promise.all([
    listCandidateInvitations(user.uid).catch((error) => {
      console.error("Invitation badge failed", error);
      return [];
    }),
    countUnreadForUser(user.uid).catch((error) => {
      console.error("Unread badge failed", error);
      return 0;
    }),
  ]);

  const t = await getT();

  const items: NavItem[] = [
    { href: "/candidate", label: t("nav.forYou"), icon: "compass" },
    { href: "/candidate/search", label: t("nav.search"), icon: "search" },
    {
      href: "/candidate/invitations",
      label: t("nav.invites"),
      icon: "sparkle",
      badge: invites.length || undefined,
    },
    // The employer side has always shown an unread count here; the candidate
    // side didn't, so a new message was invisible until they opened Chats.
    {
      href: "/candidate/matches",
      label: t("nav.chats"),
      icon: "chat",
      badge: unread || undefined,
    },
    { href: "/candidate/profile", label: t("nav.profile"), icon: "user" },
  ];

  return <AppShell items={items}>{children}</AppShell>;
}
