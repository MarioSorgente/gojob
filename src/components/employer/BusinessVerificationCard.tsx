"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  requestBusinessVerificationAction,
  updateBusinessLogoAction,
} from "@/app/employer/business-actions";
import { ImageUpload } from "@/components/ImageUpload";
import { Badge, Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { VerificationStatus } from "@/lib/types";

export function BusinessVerificationCard({
  uid,
  name,
  logo,
  status,
}: {
  uid: string;
  name: string;
  logo: string | null;
  status: VerificationStatus;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();

  return (
    <>
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Venue logo</h2>
        <ImageUpload
          uid={uid}
          name={name}
          current={logo}
          kind="logo"
          shape="square"
          label="Add logo"
          onUploaded={async (url) => {
            await updateBusinessLogoAction(url);
            router.refresh();
          }}
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Verification</h2>
          {status === "verified" && <Badge tone="green">✓ Verified</Badge>}
          {status === "pending" && <Badge tone="amber">Pending review</Badge>}
          {status === "rejected" && <Badge tone="red">Rejected</Badge>}
          {status === "not_submitted" && <Badge tone="slate">Unverified</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted">
          Verified venues stand out to candidates and get more applications.
        </p>
        {status !== "verified" && status !== "pending" && (
          <Button
            variant="outline"
            className="mt-3 w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await requestBusinessVerificationAction();
                show("Verification requested");
                router.refresh();
              })
            }
          >
            Request verification
          </Button>
        )}
      </Card>
    </>
  );
}
