"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureUser, setUserRole } from "@/lib/repos/users";
import type { UserRole } from "@/lib/types";

export async function setRoleAction(role: UserRole) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureUser(user.uid, {
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
  });
  await setUserRole(user.uid, role);

  redirect(role === "employer" ? "/employer/onboarding" : "/candidate/onboarding");
}
