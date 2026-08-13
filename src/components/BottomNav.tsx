"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeNavHref, type NavItem } from "./navigation";

export type { NavItem };

/**
 * Mobile navigation. Hidden from `md` up, where SideNav takes over.
 *
 * The bar spans the viewport (so the blur/border reach the edges on every
 * screen) while the item row stays centred and capped.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = activeNavHref(pathname, items);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 min-h-[var(--bottom-nav-clearance)] border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex h-[var(--bottom-nav-base-height)] max-w-md items-stretch">
        {items.map((item) => {
          const isActive = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium outline-none transition-colors active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
                isActive ? "text-brand" : "text-slate-400",
              )}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {item.icon}
              </span>
              {item.label}
              {item.badge ? (
                <span className="absolute left-1/2 top-1.5 ml-1.5 rounded-full bg-accent px-1.5 text-[10px] font-bold tabular-nums text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
