import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listConversationsForUser } from "@/lib/repos/chat";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function EmployerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business || !user.onboardingComplete) redirect("/employer/onboarding");

  const conversations = await listConversationsForUser(user.uid);
  const unread = conversations.reduce((n, c) => n + (c.unread?.[user.uid] ?? 0), 0);

  const items = [
    { href: "/employer", label: "Jobs", icon: "🧭" },
    { href: "/employer/candidates", label: "Find", icon: "🔍" },
    { href: "/employer/matches", label: "Chats", icon: "💬", badge: unread || undefined },
    { href: "/employer/business", label: "Venue", icon: "🏝️" },
  ];

  return (
    <div className="min-h-dvh pb-20">
      <TopBar right={<LogoutButton />} />
      <main className="mx-auto max-w-md px-5 py-5">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
