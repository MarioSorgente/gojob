import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { LogoutButton } from "./LogoutButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { NavItem } from "./navigation";
import { getI18n } from "@/lib/i18n/server";

/**
 * The candidate and employer app shell.
 *
 * Three responsive tiers driven purely by CSS breakpoints — no device detection, so it
 * responds to window resizing and split-screen, and every page stays cacheable:
 *
 *   < md       phone: sticky TopBar + fixed BottomNav, single 448px column
 *   md to lg   tablet: persistent sidebar, no bottom bar, single-column content
 *   >= lg      wide desktop: sidebar plus multi-column content where pages opt in
 *
 * The first breakpoint changes navigation only; delaying content columns until
 * lg leaves enough width beside the 240px sidebar for useful card widths. Both
 * navigations get the same NavItem[], so they cannot drift apart.
 */
export async function AppShell({
  items,
  children,
}: {
  items: NavItem[];
  children: ReactNode;
}) {
  const { locale, t } = await getI18n();

  return (
    <div className="app-shell min-h-dvh md:pl-60">
      {/* Keyboard users otherwise tab through the whole nav on every page. */}
      <a
        href="#main"
        className="sr-only left-4 top-4 z-50 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute"
      >
        {t("common.skipToContent")}
      </a>

      <SideNav
        items={items}
        footer={
          <div className="flex items-center justify-between gap-2">
            <LogoutButton label={t("common.logOut")} />
            <LocaleSwitcher current={locale} />
          </div>
        }
      />

      {/* The top bar is redundant once the sidebar carries the logo and sign-out. */}
      <div className="md:hidden">
        <TopBar
          right={
            <div className="flex items-center gap-1.5">
              <LocaleSwitcher current={locale} />
              <LogoutButton label={t("common.logOut")} />
            </div>
          }
        />
      </div>

      {/* Clear the full bottom bar, including the device safe-area inset. */}
      <main
        id="main"
        className="app-shell-content mx-auto w-full max-w-md px-5 py-5 pb-[var(--bottom-nav-clearance)] md:max-w-5xl md:px-8 md:py-8 md:pb-8"
      >
        {children}
      </main>

      <BottomNav items={items} />
    </div>
  );
}
