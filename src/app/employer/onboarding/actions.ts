"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  createBusiness,
  getBusinessByOwner,
  updateBusiness,
} from "@/lib/repos/businesses";
import { markOnboardingComplete } from "@/lib/repos/users";
import type { BusinessOnboardingInput } from "@/lib/forms";

export async function createBusinessAction(input: BusinessOnboardingInput) {
  const user = await requireRole("employer");

  // MVP heuristic for "does this business exist": a Google Maps link or a
  // website is treated as light verification. Businesses can operate unverified.
  const verified = Boolean(
    input.googleMapsUrl?.trim() || input.website?.trim(),
  );

  const businessData = {
    name: input.name.trim(),
    category: input.category,
    area: input.area,
    address: input.address.trim(),
    instagram: input.instagram?.trim() || null,
    website: input.website?.trim() || null,
    googleMapsUrl: input.googleMapsUrl?.trim() || null,
    logo: null,
    description: input.description.trim(),
    verificationStatus: verified
      ? ("verified" as const)
      : ("not_submitted" as const),
  };

  // A previous attempt may have saved the business before completing the user
  // document. Reuse that record so retrying this action cannot create another
  // business for the same owner.
  const existing = await getBusinessByOwner(user.uid);
  if (existing) {
    await updateBusiness(existing.id, businessData);
  } else {
    await createBusiness(user.uid, businessData);
  }

  await markOnboardingComplete(user.uid);
  redirect("/employer");
}
