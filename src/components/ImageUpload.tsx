"use client";

import { useRef, useState } from "react";
import { uploadPublicImage } from "@/lib/firebase/storage-client";
import { Avatar } from "./ui";
import { useToast } from "./Toast";

/**
 * Avatar-style image picker that uploads straight to Firebase Storage and hands
 * the resulting download URL back to the caller.
 */
export function ImageUpload({
  uid,
  name,
  current,
  kind = "photo",
  onUploaded,
  label = "Add photo",
  shape = "circle",
}: {
  uid: string;
  name: string;
  current: string | null;
  kind?: "photo" | "logo";
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
  shape?: "circle" | "square";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(uid, file, kind);
      setPreview(url);
      await onUploaded(url);
      show("Photo updated");
    } catch (err) {
      show((err as Error).message || "Upload failed", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className={shape === "circle" ? "" : "overflow-hidden rounded-xl"}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={name}
            className={
              shape === "circle"
                ? "h-16 w-16 rounded-full object-cover"
                : "h-16 w-16 rounded-xl object-cover"
            }
          />
        ) : (
          <Avatar name={name} size={64} />
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 text-sm font-semibold outline-none transition-colors hover:bg-surface-muted active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Uploading…" : preview ? "Change" : label}
        </button>
        <p className="mt-1 text-xs text-muted">JPG or PNG, max 5MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={label}
        tabIndex={-1}
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
