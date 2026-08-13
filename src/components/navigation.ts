export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Optional unread/notification count. */
  badge?: number;
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

  const root = items.find(
    (i) => ROOTS.has(i.href) && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
  );
  return root?.href ?? null;
}
