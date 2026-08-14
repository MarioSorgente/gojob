"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  requestEmploymentVerificationAction,
  submitIdVerificationAction,
  updatePhotoAction,
} from "@/app/candidate/profile-actions";
import { uploadPrivateDocument } from "@/lib/firebase/storage-client";
import { ImageUpload } from "@/components/ImageUpload";
import { Badge, Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { Experience, VerificationStatus } from "@/lib/types";
import { Icon } from "@/components/Icon";

function StatusBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return (
      <Badge tone="green">
        <Icon name="checkBadge" className="h-3.5 w-3.5" />
        Verified
      </Badge>
    );
    case "pending":
      return <Badge tone="amber">Pending review</Badge>;
    case "rejected":
      return <Badge tone="red">Rejected</Badge>;
    default:
      return <Badge tone="slate">Not submitted</Badge>;
  }
}

export function VerificationPanel({
  uid,
  name,
  photo,
  phoneStatus,
  idStatus,
  employmentStatus,
  experiences,
}: {
  uid: string;
  name: string;
  photo: string | null;
  phoneStatus: VerificationStatus;
  idStatus: VerificationStatus;
  employmentStatus: VerificationStatus;
  experiences: Experience[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function onIdPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadPrivateDocument(uid, file);
      await submitIdVerificationAction(path);
      show("ID submitted for review");
      router.refresh();
    } catch (err) {
      show((err as Error).message || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Profile photo</h2>
        <ImageUpload
          uid={uid}
          name={name}
          current={photo}
          kind="photo"
          onUploaded={async (url) => {
            await updatePhotoAction(url);
            router.refresh();
          }}
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Phone</h2>
          <StatusBadge status={phoneStatus} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {phoneStatus === "verified"
            ? "Your phone number is confirmed."
            : "Sign in with your phone number to verify it."}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">ID verification</h2>
          <StatusBadge status={idStatus} />
        </div>
        <p className="mt-1 text-sm text-muted">
          Optional. A verified ID boosts your profile strength and ranking. Your
          document is private — only GoJob admins can see it.
        </p>
        {idStatus !== "verified" && (
          <>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? "Uploading…"
                : idStatus === "pending"
                  ? "Replace document"
                  : "Upload ID (KTP / passport)"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={onIdPicked}
              className="hidden"
            />
          </>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Workplace verification</h2>
          <StatusBadge status={employmentStatus} />
        </div>
        <p className="mt-1 mb-3 text-sm text-muted">
          Ask GoJob to confirm a previous job with the venue.
        </p>
        {experiences.length === 0 ? (
          <p className="text-sm text-muted">Add experience to your profile first.</p>
        ) : (
          <ul className="space-y-2">
            {experiences.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.role}</p>
                  <p className="truncate text-xs text-muted">{e.companyName}</p>
                </div>
                {e.verificationStatus === "not_submitted" ? (
                  <Button
                    size="sm"
                    variant="subtle"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await requestEmploymentVerificationAction(e.id);
                        show("Verification requested");
                        router.refresh();
                      })
                    }
                  >
                    Request
                  </Button>
                ) : (
                  <StatusBadge status={e.verificationStatus} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
