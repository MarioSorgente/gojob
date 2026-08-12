import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import type { Business } from "../types";

const col = () => adminDb().collection(COLLECTIONS.businesses);

export async function getBusiness(id: string): Promise<Business | null> {
  const snap = await col().doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() as Omit<Business, "id">) };
}

export async function getBusinessByOwner(
  ownerId: string,
): Promise<Business | null> {
  const snap = await col().where("ownerId", "==", ownerId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<Business, "id">) };
}

export async function createBusiness(
  ownerId: string,
  data: Omit<Business, "id" | "ownerId" | "createdAt" | "verificationStatus"> &
    Partial<Pick<Business, "verificationStatus">>,
): Promise<Business> {
  const ref = col().doc();
  const business: Omit<Business, "id"> = {
    ownerId,
    createdAt: new Date().toISOString(),
    // MVP: we attempt to "establish existence" but businesses can use the
    // platform unverified. Manual verification flips this later.
    verificationStatus: data.verificationStatus ?? "not_submitted",
    ...data,
  };
  await ref.set(business);
  return { id: ref.id, ...business };
}

export async function updateBusiness(
  id: string,
  data: Partial<Omit<Business, "id" | "ownerId" | "createdAt">>,
): Promise<void> {
  await col().doc(id).set(data, { merge: true });
}
