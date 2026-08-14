"use client";

import { Button, ButtonLink } from "./ui";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { useT } from "@/lib/i18n/client";

/**
 * The "It's a Match" overlay shown on mutual interest (scope §13).
 *
 * Built on `Sheet` rather than its own backdrop: the hand-rolled version had no
 * dialog role, no Escape, no focus trap and no focus restore — and when it was
 * rendered from InvitationActions it had no dismiss control at all, so a
 * keyboard user was simply stuck.
 */
export function MatchCelebration({
  open,
  chatHref,
  title,
  subtitle,
  onClose,
}: {
  open: boolean;
  chatHref: string;
  title?: string;
  /** Who the match is with. */
  subtitle?: string;
  onClose?: () => void;
}) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onClose={onClose ?? (() => {})}
      title={title ?? t("chat.matchTitle")}
      hideHeader
      className="text-center sm:max-w-sm"
    >
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
        <Icon name="sparkle" className="h-8 w-8" />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold text-brand">
        {title ?? t("chat.matchTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {subtitle ? `${subtitle} — ${t("chat.matchHint")}` : t("chat.matchHint")}
      </p>
      <div className="mt-6 space-y-2">
        <ButtonLink href={chatHref} size="lg" className="w-full">
          <Icon name="chat" className="h-4 w-4" />
          {t("chat.openChat")}
        </ButtonLink>
        {onClose && (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            {t("common.close")}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
