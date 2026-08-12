import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import type { AppUser, UserRole } from "../types";

const col = () => adminDb().collection(COLLECTIONS.users);

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await col().doc(uid).get();
  if (!snap.exists) return null;
  return { uid, ...(snap.data() as Omit<AppUser, "uid">) };
}

/** Create the user doc on first sign-in if it does not exist yet. */
export async function ensureUser(
  uid: string,
  info: { email: string | null; phone: string | null; displayName: string | null },
): Promise<AppUser> {
  const ref = col().doc(uid);
  const snap = await ref.get();
  if (snap.exists) return { uid, ...(snap.data() as Omit<AppUser, "uid">) };

  const user: Omit<AppUser, "uid"> = {
    email: info.email,
    phone: info.phone,
    role: null,
    displayName: info.displayName,
    language: null,
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  };
  await ref.set(user);
  return { uid, ...user };
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await col().doc(uid).set({ role }, { merge: true });
}

export async function markOnboardingComplete(uid: string): Promise<void> {
  await col().doc(uid).set({ onboardingComplete: true }, { merge: true });
}

export async function updateUser(
  uid: string,
  data: Partial<Pick<AppUser, "phone" | "displayName" | "language">>,
): Promise<void> {
  await col().doc(uid).set(data, { merge: true });
}
