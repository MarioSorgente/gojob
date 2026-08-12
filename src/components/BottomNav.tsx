"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Optional unread/notification count. */
  badge?: number;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/candidate" &&
              item.href !== "/employer" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand" : "text-slate-400",
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span className="absolute right-1/2 top-1.5 translate-x-3 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
