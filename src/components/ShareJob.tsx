"use client";

/**
 * Share sheet for a job (scope §20 — Instagram acquisition).
 *
 * The point: replace "DM us your CV" with "Apply through GoJob". Employers
 * share a public job link to Instagram/WhatsApp; candidates land on the public
 * job page and apply (creating an account inline if needed).
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "./ui";
import { useToast } from "./Toast";

export function ShareJob({
  jobId,
  role,
  businessName,
}: {
  jobId: string;
  role: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const { show } = useToast();

  // Resolve the absolute URL when the sheet opens — window isn't available
  // during server rendering.
  function openSheet() {
    setUrl(`${window.location.origin}/jobs/${jobId}`);
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !url) return;
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, url]);

  const message = `We're hiring a ${role} at ${businessName}. Apply here: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      show("Link copied");
    } catch {
      show("Could not copy — select the link manually", "error");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${role} at ${businessName}`, text: message, url });
        return true;
      } catch {
        /* user cancelled */
      }
    }
    return false;
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={openSheet}>
        🔗 Share job
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-surface p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">Share this job</h2>
                <p className="text-sm text-muted">
                  Post it to Instagram or WhatsApp — candidates apply through GoJob.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="-m-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-xl leading-none text-muted outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-slate-50 p-3">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{url}</span>
              <Button size="sm" onClick={copy}>
                Copy
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold outline-none transition-colors hover:bg-slate-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                💬 WhatsApp
              </a>
              <button
                onClick={async () => {
                  const shared = await nativeShare();
                  if (!shared) {
                    await copy();
                    show("Link copied — paste it in your Instagram bio or story");
                  }
                }}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold outline-none transition-colors hover:bg-slate-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                📷 Instagram
              </button>
            </div>

            {qr && (
              <div className="mt-4 flex flex-col items-center rounded-xl border border-border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code linking to the job" className="h-40 w-40" />
                <p className="mt-2 text-xs text-muted">
                  Print it for the venue — scan to apply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
