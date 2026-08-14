"use client";

/**
 * Share sheet for a job (scope §20 — Instagram acquisition).
 *
 * The point: replace "DM us your CV" with "Apply through GoJob". Employers
 * share a public job link to Instagram/WhatsApp; candidates land on the public
 * job page and apply (creating an account inline if needed).
 *
 * Now built on `Sheet` — which was extracted from this component's own overlay
 * and then never adopted here, leaving the share sheet without a dialog role,
 * Escape, focus trap, focus restore or scroll lock.
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, interactive } from "./ui";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

export function ShareJob({
  jobId,
  role,
  businessName,
}: {
  jobId: string;
  role: string;
  businessName: string;
}) {
  const t = useT();
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

  const message = `${role} · ${businessName} — ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      show(t("job.linkCopied"));
      return true;
    } catch {
      show(t("job.copyFailed"), "error");
      return false;
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${role} — ${businessName}`,
          text: message,
          url,
        });
        return true;
      } catch {
        /* user cancelled */
      }
    }
    return false;
  }

  const tile = cn(
    "flex items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 py-3 text-sm font-semibold no-underline",
    interactive,
    "hover:bg-surface-muted",
  );

  return (
    <>
      <Button variant="outline" className="w-full" onClick={openSheet}>
        <Icon name="share" className="h-4 w-4" />
        {t("job.shareButton")}
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("job.shareTitle")}
        description={t("job.shareHint")}
      >
        <div className="mb-4 flex items-center gap-2 rounded-control border border-border bg-surface-muted p-3">
          <span className="min-w-0 flex-1 truncate text-sm text-subtle">{url}</span>
          <Button size="sm" onClick={copy}>
            {t("job.copyLink")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={tile}
          >
            <Icon name="chat" className="h-4 w-4" />
            {t("job.shareWhatsApp")}
          </a>
          <button
            type="button"
            onClick={async () => {
              const shared = await nativeShare();
              if (!shared && (await copy())) show(t("job.instagramHint"));
            }}
            className={tile}
          >
            <Icon name="share" className="h-4 w-4" />
            {t("job.shareInstagram")}
          </button>
        </div>

        {qr && (
          <div className="mt-4 flex flex-col items-center rounded-control border border-border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={t("job.qrAlt")} className="h-40 w-40" />
            <p className="mt-2 text-center text-xs text-muted">{t("job.qrHint")}</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
