"use client";

import Link from "next/link";
import { Button, ButtonLink, Card } from "./ui";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./brand";
import { useT } from "@/lib/i18n/client";

/**
 * The shared body of every error and not-found screen.
 *
 * Before this the app had no `error.tsx` or `not-found.tsx` at all, so a thrown
 * server error — or an expired shared job link, which is the Instagram
 * acquisition surface — handed the visitor Next's unstyled default page with no
 * GoJob chrome and no way back.
 */
export function ErrorScreen({
  icon = "warning",
  title,
  hint,
  /** Supplied by `error.tsx` boundaries; omitted by 404s. */
  onRetry,
  homeHref = "/",
  children,
}: {
  icon?: IconName;
  title: string;
  hint: string;
  onRetry?: () => void;
  homeHref?: string;
  children?: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6">
      <Link
        href="/"
        className="w-fit rounded outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Logo />
      </Link>

      <div className="my-auto flex justify-center py-10">
        <Card className="w-full max-w-md p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning">
            <Icon name={icon} className="h-6 w-6" />
          </span>
          <h1 className="type-title mt-4">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{hint}</p>

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {onRetry && (
              <Button onClick={onRetry} size="lg">
                {t("error.reload")}
              </Button>
            )}
            <ButtonLink href={homeHref} size="lg" variant={onRetry ? "outline" : "primary"}>
              {t("error.goHome")}
            </ButtonLink>
          </div>

          {children}
        </Card>
      </div>
    </div>
  );
}
