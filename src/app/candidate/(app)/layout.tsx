import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCandidateInvitations } from "@/lib/repos/pipeline";
import { countUnreadForUser } from "@/lib/repos/chat";
import { AppShell } from "@/components/AppShell";

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

  const items = [
    { href: "/candidate", label: "For you", icon: "🧭" },
    { href: "/candidate/search", label: "Search", icon: "🔍" },
    {
      href: "/candidate/invitations",
      label: "Invites",
      icon: "✨",
      badge: invites.length || undefined,
    },
    // The employer side has always shown an unread count here; the candidate
    // side didn't, so a new message was invisible until they opened Chats.
    { href: "/candidate/matches", label: "Chats", icon: "💬", badge: unread || undefined },
    { href: "/candidate/profile", label: "Profile", icon: "🙂" },
  ];

  return <AppShell items={items}>{children}</AppShell>;
}
