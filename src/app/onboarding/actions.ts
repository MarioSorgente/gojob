"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureUser, setUserRole } from "@/lib/repos/users";
import { safeNextPath } from "@/lib/nextPath";
import type { UserRole } from "@/lib/types";

export async function setRoleAction(role: UserRole, next?: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureUser(user.uid, {
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
  });
  await setUserRole(user.uid, role);

  const base = role === "employer" ? "/employer/onboarding" : "/candidate/onboarding";
  // Carry `next` (e.g. a shared job link) through onboarding.
  const target = next ? safeNextPath(next, "") : "";
  redirect(target ? `${base}?next=${encodeURIComponent(target)}` : base);
}
