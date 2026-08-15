"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { useT } from "@/lib/i18n/client";

/**
 * The app's one overlay primitive: a bottom sheet on phones, a centred dialog
 * from `sm` up.
 *
 * Extracted from the hand-rolled overlay in ShareJob, which was the only
 * responsive component in the codebase but was missing everything that makes a
 * dialog usable: no role, no Escape, no focus trap, no focus restore, no scroll
 * lock. Those are implemented here once so MatchCelebration, the share sheet and
 * the score explainer can't each get them subtly wrong.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
  /** Hide the visible header when the content supplies its own. */
  hideHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => onClose(), [onClose]);

  // Remember what had focus so it can be handed back on close — otherwise focus
  // falls to <body> and keyboard users lose their place in the page.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    return () => restoreFocusTo.current?.focus?.();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the panel, then keep Tab inside it.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = Array.from(panel!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  // `open` is always false during server rendering — every caller drives it from
  // `useState(false)` — so there is no hydration mismatch to guard against, only
  // the absence of a DOM to portal into.
  if (!open || typeof document === "undefined") return null;

  /**
   * Rendered into <body>, not in place.
   *
   * `position: fixed` resolves against the nearest ancestor with a `transform`,
   * `filter` or `contain` — not the viewport. The swipe deck applies a live
   * `translateX()` to the card it drags, and the chat shell sets
   * `overflow: hidden`. Rendering inline meant a sheet opened from inside either
   * one was positioned and clipped relative to that card instead of covering the
   * page: it looked like an inline panel jammed into the layout rather than a
   * dialog, and the backdrop never covered the background.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        // Clicks inside must not reach the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-panel bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-overlay outline-none sm:rounded-panel sm:pb-6",
          className,
        )}
      >
        <div className={cn("mb-4 flex items-start justify-between gap-4", hideHeader && "sr-only")}>
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {!hideHeader && (
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close")}
              className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
