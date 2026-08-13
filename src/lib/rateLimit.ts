import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase/admin";

/**
 * Per-user rate limiting for write actions.
 *
 * Nothing previously stopped a script spamming applications, invitations or
 * chat messages — server actions authenticated the caller but never throttled
 * them.
 *
 * Fixed-window counters in Firestore. Not the most precise algorithm (a burst
 * can straddle a window boundary), but it needs no new infrastructure, and the
 * limits below are set high enough that the boundary case is irrelevant: these
 * exist to stop automation, not to police enthusiastic users.
 *
 * The design rule is **fail open**. If Firestore is slow or the counter write
 * throws, the action proceeds. A rate limiter that takes down the product when
 * it breaks is worse than the abuse it prevents.
 */

export interface RateLimitRule {
  /** Maximum actions allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Shown to the user when they hit it. */
  message: string;
}

export const RATE_LIMITS = {
  apply: {
    limit: 60,
    windowSeconds: 3600,
    message: "You've applied to a lot of jobs just now. Try again in a few minutes.",
  },
  invite: {
    limit: 100,
    windowSeconds: 3600,
    message: "You've sent a lot of invitations just now. Try again in a few minutes.",
  },
  message: {
    limit: 120,
    windowSeconds: 300,
    message: "You're sending messages very quickly. Take a breath and try again.",
  },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/** Counter document id: one per (user, action, window). */
function counterId(uid: string, action: RateLimitAction, windowSeconds: number): string {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  return `${uid}_${action}_${window}`;
}

/**
 * Record one use of `action` by `uid`.
 *
 * Returns a user-facing message when the caller is over the limit, or null when
 * the action should proceed. Deliberately returns rather than throws: server
 * actions must hand this back as data, because Next redacts thrown error
 * messages in production builds and the user would see nothing useful.
 */
export async function checkRateLimit(
  uid: string,
  action: RateLimitAction,
): Promise<string | null> {
  const rule = RATE_LIMITS[action];
  const ref = adminDb()
    .collection("rateLimits")
    .doc(counterId(uid, action, rule.windowSeconds));

  let count: number;
  try {
    // Increment first, then judge: two concurrent requests each observe their
    // own post-increment value, so neither slips through on a stale read.
    await ref.set(
      {
        uid,
        action,
        count: FieldValue.increment(1),
        // Lets a TTL policy or cleanup job drop stale windows.
        expiresAt: new Date(Date.now() + rule.windowSeconds * 2000).toISOString(),
      },
      { merge: true },
    );
    const snap = await ref.get();
    count = (snap.data()?.count as number | undefined) ?? 0;
  } catch (error) {
    // Fail open — see the note at the top of this file.
    console.error(`Rate limit check failed for ${action}; allowing`, error);
    return null;
  }

  return count > rule.limit ? rule.message : null;
}
