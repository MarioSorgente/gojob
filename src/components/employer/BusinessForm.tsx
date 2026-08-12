"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBusinessAction } from "@/app/employer/onboarding/actions";
import { updateBusinessAction } from "@/app/employer/business-actions";
import { AREAS, BUSINESS_CATEGORIES } from "@/lib/taxonomy";
import type { BusinessOnboardingInput } from "@/lib/forms";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";

export function BusinessForm({
  mode = "create",
  defaults,
}: {
  mode?: "create" | "edit";
  defaults?: Partial<BusinessOnboardingInput>;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [name, setName] = useState(defaults?.name ?? "");
  const [category, setCategory] = useState<string>(
    defaults?.category ?? BUSINESS_CATEGORIES[0],
  );
  const [area, setArea] = useState<string>(defaults?.area ?? AREAS[0]);
  const [address, setAddress] = useState(defaults?.address ?? "");
  const [instagram, setInstagram] = useState(defaults?.instagram ?? "");
  const [website, setWebsite] = useState(defaults?.website ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(defaults?.googleMapsUrl ?? "");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your business name.");
      return;
    }
    setError(null);
    const payload: BusinessOnboardingInput = {
      name,
      category,
      area,
      address,
      instagram: instagram || null,
      website: website || null,
      googleMapsUrl: googleMapsUrl || null,
      description,
    };
    start(async () => {
      if (mode === "edit") {
        await updateBusinessAction(payload);
        show("Venue updated");
        router.push("/employer/business");
      } else {
        await createBusinessAction(payload);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Business name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Milk & Madu"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Area">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Jl. Pantai Berawa No.52"
        />
      </Field>
      <Field label="Google Maps link" hint="Adding this verifies your business ✓">
        <Input
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram">
          <Input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourvenue"
          />
        </Field>
        <Field label="Website">
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell candidates about your venue…"
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "edit"
            ? "Save changes"
            : "Create business"}
      </Button>
    </form>
  );
}
