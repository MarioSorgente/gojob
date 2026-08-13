"use client";

import { Button, ButtonLink } from "./ui";

/** The "It's a Match" overlay shown on mutual interest (scope §13). */
export function MatchCelebration({
  open,
  chatHref,
  title = "It's a Match!",
  subtitle,
  onClose,
}: {
  open: boolean;
  chatHref: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-xl">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-2xl font-extrabold text-brand">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6 space-y-2">
          <ButtonLink href={chatHref} size="lg" className="w-full">
            Open chat 💬
          </ButtonLink>
          {onClose && (
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Later
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
