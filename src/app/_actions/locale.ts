"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { updateUser } from "@/lib/repos/users";
import {
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Persist a language choice.
 *
 * The cookie is the source of truth so logged-out visitors on the landing page
 * and public job pages get a language too. When there is a session we also
 * write `users.language`, so the choice follows the account to a new device.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  const user = await getSessionUser();
  if (user) {
    await updateUser(user.uid, { language: locale }).catch((error) => {
      // A failed write must not block the switch — the cookie already took.
      console.error("Could not persist language preference", error);
    });
  }

  revalidatePath("/", "layout");
}
