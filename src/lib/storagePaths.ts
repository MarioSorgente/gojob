/**
 * Validation for user-supplied Storage references.
 *
 * storage.rules already stops a user *writing* outside `users/{uid}/…`, but the
 * server actions that persist the result take a plain string from the client.
 * Nothing stopped a caller posting someone else's object path — or an arbitrary
 * off-site URL — straight into their profile, which would then be rendered to
 * other users. These helpers close that gap by re-deriving the object path and
 * checking it against the uid the session says is calling.
 *
 * Pure and dependency-free so it can be unit tested and used from any layer.
 */

/** Hosts that can serve objects out of a Firebase Storage bucket. */
const DOWNLOAD_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "firebasestorage.app",
]);

/**
 * Extract the bucket-relative object path from either a Firebase download URL
 * or an already-relative path. Returns null when the input isn't a storage
 * reference we recognise.
 *
 * Handles the three shapes in play:
 *   users/{uid}/private/id-1.jpg                          (raw path)
 *   https://firebasestorage.googleapis.com/v0/b/B/o/users%2F…?alt=media&token=…
 *   https://storage.googleapis.com/B/users/…               (direct GCS)
 *   http://localhost:9199/v0/b/B/o/users%2F…               (emulator)
 */
export function storageObjectPath(reference: string): string | null {
  const value = reference.trim();
  if (!value) return null;

  // Raw path — no scheme.
  if (!value.includes("://")) {
    return normalizePath(value);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isEmulator =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isEmulator && !isKnownHost(url.hostname)) return null;

  // /v0/b/{bucket}/o/{url-encoded object path}
  const v0 = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
  if (v0) {
    try {
      return normalizePath(decodeURIComponent(v0[1]));
    } catch {
      // Malformed percent-encoding — treat as unrecognised rather than trusting it.
      return null;
    }
  }

  // /{bucket}/{object path}
  const direct = url.pathname.match(/^\/[^/]+\/(.+)$/);
  if (direct && url.hostname === "storage.googleapis.com") {
    try {
      return normalizePath(decodeURIComponent(direct[1]));
    } catch {
      return null;
    }
  }

  return null;
}

function isKnownHost(hostname: string): boolean {
  if (DOWNLOAD_HOSTS.has(hostname)) return true;
  // Bucket-scoped hosts, e.g. my-project.firebasestorage.app
  return hostname.endsWith(".firebasestorage.app");
}

/**
 * Reject traversal and leading slashes before any prefix comparison, so
 * "users/me/public/../../users/you/private/id.jpg" can't slip through.
 */
function normalizePath(path: string): string | null {
  const trimmed = path.replace(/^\/+/, "");
  if (!trimmed) return null;
  const segments = trimmed.split("/");
  if (segments.some((s) => s === "." || s === ".." || s === "")) return null;
  return segments.join("/");
}

export type StorageScope = "public" | "private";

/**
 * True when `reference` points at an object the given user owns, in the given
 * scope. This is the check every action that persists an upload must run.
 */
export function isOwnedStorageReference(
  reference: string,
  uid: string,
  scope: StorageScope,
): boolean {
  if (!uid || uid.includes("/")) return false;
  const path = storageObjectPath(reference);
  if (!path) return false;
  return path.startsWith(`users/${uid}/${scope}/`);
}

/**
 * Throwing form for server actions. The message is deliberately vague — a
 * caller probing this shouldn't learn which part of the check failed.
 */
export function assertOwnedStorageReference(
  reference: string,
  uid: string,
  scope: StorageScope,
): void {
  if (!isOwnedStorageReference(reference, uid, scope)) {
    throw new Error("Invalid upload reference");
  }
}
