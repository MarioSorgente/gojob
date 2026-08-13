"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./brand";
import { cn } from "@/lib/cn";
import { activeNavHref, type NavItem } from "./navigation";

/**
 * Desktop navigation. Hidden below `md`, where BottomNav takes over.
 *
 * Takes the same NavItem[] the bottom bar uses, so the two can't drift apart.
 */
export function SideNav({ items, footer }: { items: NavItem[]; footer?: React.ReactNode }) {
  const pathname = usePathname();
  const active = activeNavHref(pathname, items);

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface md:flex">
      <div className="px-6 py-5">
        <Link
          href="/"
          className="inline-block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Logo size="md" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {items.map((item) => {
          const isActive = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                isActive
                  ? "bg-brand-soft text-brand-dark"
                  : "text-slate-600 hover:bg-slate-100 hover:text-foreground",
              )}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {footer ? <div className="border-t border-border px-3 py-3">{footer}</div> : null}
    </aside>
  );
}
