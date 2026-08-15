import type { IconName } from "./Icon";

export interface NavItem {
  href: string;
  label: string;
  /** A key into the icon set — a plain string union, so it crosses the
   *  server→client boundary in AppShell without needing a component prop. */
  icon: IconName;
  /** Optional unread/notification count. */
  badge?: number;
  /**
   * Extra route prefixes this tab owns.
   *
   * A conversation lives at `/candidate/chat/{id}`, which is not under
   * `/candidate/matches`, so it used to fall through to the section root and
   * light up "For you" while the user was reading a message.
   */
  owns?: string[];
}

/** Section roots, which own any route that no other tab claims. */
const ROOTS = new Set(["/candidate", "/employer", "/admin"]);

/**
 * Which nav item should appear active for the current path.
 *
 * Detail routes previously highlighted nothing — opening a job cleared the whole
 * bar and the user lost their sense of place. Resolution order:
 *   1. exact match             /candidate/search  -> Search
 *   2. longest sub-route match /employer/candidates/x -> Find
 *   3. the section root        /employer/jobs/x   -> Jobs
 *
 * Returned as a single href so the bottom bar and the sidebar can't disagree.
 */
export function activeNavHref(pathname: string, items: NavItem[]): string | null {
  const exact = items.find((i) => i.href === pathname);
  if (exact) return exact.href;

  const nested = items
    .filter((i) => !ROOTS.has(i.href) && pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (nested) return nested.href;

  // Routes a tab explicitly claims but doesn't sit under.
  const owned = items.find((i) =>
    i.owns?.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );
  if (owned) return owned.href;

  const root = items.find(
    (i) => ROOTS.has(i.href) && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
  );
  return root?.href ?? null;
}
