import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";

export function TopBar({
  right,
  back,
}: {
  right?: ReactNode;
  back?: { href: string; label?: string };
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
        {back ? (
          <Link href={back.href} className="text-sm font-medium text-muted">
            ← {back.label ?? "Back"}
          </Link>
        ) : (
          <Link href="/">
            <Logo size="sm" />
          </Link>
        )}
        <div>{right}</div>
      </div>
    </header>
  );
}
