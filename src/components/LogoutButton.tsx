"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/lib/firebase/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.replace("/");
          router.refresh();
        })
      }
      disabled={pending}
      className="text-sm font-medium text-muted hover:text-foreground"
    >
      {pending ? "…" : "Log out"}
    </button>
  );
}
