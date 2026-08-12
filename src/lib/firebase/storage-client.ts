"use client";

/**
 * Browser-side uploads to Firebase Storage.
 *
 *   users/{uid}/public/**   profile photos, business logos (publicly readable)
 *   users/{uid}/private/**  ID documents (owner-only, per storage.rules)
 */

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getClientStorage } from "./client";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, matches storage.rules
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() || "bin";
}

/** Upload a public image (profile photo / logo). Returns its download URL. */
export async function uploadPublicImage(
  uid: string,
  file: File,
  kind: "photo" | "logo",
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 5MB.");
  }
  const path = `users/${uid}/public/${kind}-${Date.now()}.${extensionOf(file)}`;
  const storageRef = ref(getClientStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/** Upload a private verification document (ID). Returns its storage path. */
export async function uploadPrivateDocument(
  uid: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_DOC_BYTES) {
    throw new Error("File must be smaller than 10MB.");
  }
  const path = `users/${uid}/private/id-${Date.now()}.${extensionOf(file)}`;
  const storageRef = ref(getClientStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return path;
}
