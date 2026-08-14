"use client";

import { useEffect } from "react";

/**
 * Force a re-render when a page is restored from the back/forward cache.
 *
 * Session-dependent pages are rendered per request and sent with `no-store`,
 * which suppresses bfcache in Chrome — but not in every browser. Without this,
 * Safari can restore a *snapshot* of the landing page taken before sign-in,
 * complete with a "Log in" button, which is exactly the "going back logs me
 * out" report this whole change is about.
 *
 * Mount only on pages whose chrome changes with the session.
 */
export function BfcacheGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
