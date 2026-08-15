import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { BackLink } from "./ui";

export function TopBar({
  right,
  back,
  /** See the note in SideNav — inside the app the logo means "my dashboard". */
  homeHref = "/",
}: {
  right?: ReactNode;
  back?: { href: string; label: string };
  homeHref?: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-2">
        {back ? (
          <BackLink href={back.href}>{back.label}</BackLink>
        ) : (
          <Link
            href={homeHref}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Logo size="sm" />
          </Link>
        )}
        <div>{right}</div>
      </div>
    </header>
  );
}
