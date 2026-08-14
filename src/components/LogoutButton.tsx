"use client";

import { useState } from "react";
import { logout } from "@/lib/firebase/auth-client";
import { Icon } from "./Icon";
import { Spinner, interactive } from "./ui";
import { cn } from "@/lib/cn";

export function LogoutButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setPending(true);
        try {
          await logout();
        } finally {
          // A full load, not router.replace + refresh. Signing out changes what
          // every server component renders, and Back/Forward restores router-cache
          // entries regardless of staleness — so a soft navigation can leave a
          // signed-in-looking page one Back press away. See AuthForm for the
          // mirror image of this on the way in. The Next lint rule prefers a soft
          // navigation for speed, which is the behaviour being avoided here.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/");
        }
      }}
      disabled={pending}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted",
        "hover:bg-surface-muted hover:text-foreground",
        interactive,
      )}
    >
      {pending ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <Icon name="logout" className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
