"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureUser, setSelfServiceUserRole } from "@/lib/repos/users";
import { safeNextPath } from "@/lib/nextPath";

export async function setRoleAction(
  role: "candidate" | "employer",
  next?: string,
) {
  if (role !== "candidate" && role !== "employer") {
    throw new Error("Invalid onboarding role");
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureUser(user.uid, {
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
  });
  await setSelfServiceUserRole(user.uid, role);

  const base =
    role === "employer" ? "/employer/onboarding" : "/candidate/onboarding";
  // Carry `next` (e.g. a shared job link) through onboarding.
  const target = next ? safeNextPath(next, "") : "";
  redirect(target ? `${base}?next=${encodeURIComponent(target)}` : base);
}
