import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { countUnreadForUser } from "@/lib/repos/chat";
import { countSavedForBusiness } from "@/lib/repos/shortlist";
import { AppShell } from "@/components/AppShell";

export default async function EmployerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business || !user.onboardingComplete) redirect("/employer/onboarding");

  // These two feed nav badges only, so they run in parallel and count rather
  // than reading whole documents — this layout renders on every employer page.
  // See the note in the candidate layout: a badge query must not be able to
  // bring down the shell.
  const [unread, saved] = await Promise.all([
    countUnreadForUser(user.uid).catch((error) => {
      console.error("Unread badge failed", error);
      return 0;
    }),
    countSavedForBusiness(business.id),
  ]);

  const items = [
    { href: "/employer", label: "Jobs", icon: "🧭" },
    { href: "/employer/candidates", label: "Find", icon: "🔍" },
    {
      href: "/employer/shortlist",
      label: "Shortlist",
      icon: "⭐",
      badge: saved || undefined,
    },
    { href: "/employer/matches", label: "Chats", icon: "💬", badge: unread || undefined },
    { href: "/employer/business", label: "Venue", icon: "🏝️" },
  ];

  return <AppShell items={items}>{children}</AppShell>;
}
