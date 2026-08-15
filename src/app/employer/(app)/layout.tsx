import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { countUnreadForUser } from "@/lib/repos/chat";
import { countSavedForBusiness } from "@/lib/repos/shortlist";
import { AppShell } from "@/components/AppShell";
import type { NavItem } from "@/components/navigation";
import { getT } from "@/lib/i18n/server";

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

  const t = await getT();

  const items: NavItem[] = [
    { href: "/employer", label: t("nav.jobs"), icon: "briefcase" },
    { href: "/employer/candidates", label: t("nav.find"), icon: "search" },
    {
      href: "/employer/shortlist",
      label: t("nav.shortlist"),
      icon: "star",
      badge: saved || undefined,
    },
    {
      href: "/employer/matches",
      label: t("nav.chats"),
      icon: "chat",
      badge: unread || undefined,
      owns: ["/employer/chat"],
    },
    { href: "/employer/business", label: t("nav.venue"), icon: "building" },
  ];

  return <AppShell items={items}>{children}</AppShell>;
}
