import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCandidateInvitations } from "@/lib/repos/pipeline";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function CandidateAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("candidate");
  if (!user.onboardingComplete) redirect("/candidate/onboarding");

  const invites = await listCandidateInvitations(user.uid);
  const items = [
    { href: "/candidate", label: "Jobs", icon: "🧭" },
    { href: "/candidate/applications", label: "Applied", icon: "📄" },
    {
      href: "/candidate/invitations",
      label: "Invites",
      icon: "✨",
      badge: invites.length || undefined,
    },
    { href: "/candidate/matches", label: "Chats", icon: "💬" },
    { href: "/candidate/profile", label: "Profile", icon: "🙂" },
  ];

  return (
    <div className="min-h-dvh pb-20">
      <TopBar right={<LogoutButton />} />
      <main className="mx-auto max-w-md px-5 py-5">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
