"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createBusiness } from "@/lib/repos/businesses";
import { markOnboardingComplete } from "@/lib/repos/users";
import type { BusinessOnboardingInput } from "@/lib/forms";

export async function createBusinessAction(input: BusinessOnboardingInput) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // MVP heuristic for "does this business exist": a Google Maps link or a
  // website is treated as light verification. Businesses can operate unverified.
  const verified = Boolean(input.googleMapsUrl?.trim() || input.website?.trim());

  await createBusiness(user.uid, {
    name: input.name.trim(),
    category: input.category,
    area: input.area,
    address: input.address.trim(),
    instagram: input.instagram?.trim() || null,
    website: input.website?.trim() || null,
    googleMapsUrl: input.googleMapsUrl?.trim() || null,
    logo: null,
    description: input.description.trim(),
    verificationStatus: verified ? "verified" : "not_submitted",
  });

  await markOnboardingComplete(user.uid);
  redirect("/employer");
}
