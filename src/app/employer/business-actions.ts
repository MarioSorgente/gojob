"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner, updateBusiness } from "@/lib/repos/businesses";
import { assertOwnedStorageReference } from "@/lib/storagePaths";
import type { BusinessOnboardingInput } from "@/lib/forms";

async function ownedBusiness(uid: string) {
  const business = await getBusinessByOwner(uid);
  if (!business) throw new Error("No business for this account");
  return business;
}

export async function updateBusinessAction(input: BusinessOnboardingInput) {
  const user = await requireRole("employer");
  const business = await ownedBusiness(user.uid);

  await updateBusiness(business.id, {
    name: input.name.trim(),
    category: input.category,
    area: input.area,
    address: input.address.trim(),
    instagram: input.instagram?.trim() || null,
    website: input.website?.trim() || null,
    googleMapsUrl: input.googleMapsUrl?.trim() || null,
    description: input.description.trim(),
  });

  revalidatePath("/employer/business");
  revalidatePath("/employer");
}

export async function updateBusinessLogoAction(url: string) {
  const user = await requireRole("employer");
  const business = await ownedBusiness(user.uid);
  // Logos upload to users/{uid}/public/, so the owner's uid is the scope here —
  // see the note in candidate/profile-actions.ts on why the client's URL can't
  // be trusted as given.
  assertOwnedStorageReference(url, user.uid, "public");
  await updateBusiness(business.id, { logo: url });
  revalidatePath("/employer/business");
}

/** Ask GoJob to verify the venue — lands in the admin queue (scope §6). */
export async function requestBusinessVerificationAction() {
  const user = await requireRole("employer");
  const business = await ownedBusiness(user.uid);
  if (business.verificationStatus === "verified") return;
  await updateBusiness(business.id, { verificationStatus: "pending" });
  revalidatePath("/employer/business");
}
