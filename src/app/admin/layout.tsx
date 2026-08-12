import type { ReactNode } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Logo } from "@/components/brand";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Admin
            </span>
          </Link>
          <LogoutButton />
        </div>
        <div className="mx-auto max-w-5xl px-5">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
