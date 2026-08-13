import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { LogoutButton } from "./LogoutButton";
import type { NavItem } from "./navigation";

/**
 * The candidate and employer app shell.
 *
 * Two layouts driven purely by CSS breakpoints — no device detection, so it
 * responds to window resizing and split-screen, and every page stays cacheable:
 *
 *   < md   phone: sticky TopBar + fixed BottomNav, single 448px column
 *   >= md  desktop: persistent left sidebar, no bottom bar, wide content
 *
 * Both get the same NavItem[], so the two navigations cannot drift apart.
 */
export function AppShell({
  items,
  children,
}: {
  items: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="app-shell min-h-dvh md:pl-60">
      <SideNav items={items} footer={<LogoutButton />} />

      {/* The top bar is redundant once the sidebar carries the logo and sign-out. */}
      <div className="md:hidden">
        <TopBar right={<LogoutButton />} />
      </div>

      {/* pb-20 clears the fixed bottom bar on phones; the sidebar needs none. */}
      <main className="app-shell-content mx-auto w-full max-w-md px-5 py-5 pb-20 md:max-w-5xl md:px-8 md:py-8 md:pb-8">
        {children}
      </main>

      <BottomNav items={items} />
    </div>
  );
}
