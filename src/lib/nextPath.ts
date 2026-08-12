/**
 * Sanitize a `next` redirect target. Only same-origin absolute paths are
 * allowed, so a shared link can never bounce a user to another site.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback; // protocol-relative
  return value;
}
