"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/app/_actions/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { interactive } from "./ui";

const SHORT: Record<Locale, string> = { en: "EN", id: "ID" };

/**
 * Two-language toggle. A segmented control rather than a dropdown: with exactly
 * two options a menu costs an extra tap for nothing, and the current language
 * stays visible.
 */
export function LocaleSwitcher({
  current,
  className,
  tone = "default",
}: {
  current: Locale;
  className?: string;
  /** `onBrand` for the dark teal auth panel and any coloured surface. */
  tone?: "default" | "onBrand";
}) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        tone === "onBrand"
          ? "border-white/25 bg-white/10"
          : "border-border bg-surface",
        pending && "opacity-60",
        className,
      )}
    >
      <Icon
        name="language"
        className={cn(
          "ml-1.5 h-3.5 w-3.5",
          tone === "onBrand" ? "text-white/70" : "text-muted",
        )}
      />
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={active}
            aria-label={LOCALE_LABELS[locale]}
            disabled={pending || active}
            onClick={() => start(() => setLocaleAction(locale))}
            className={cn(
              "min-h-7 rounded-full px-2.5 text-xs font-bold",
              interactive,
              "disabled:pointer-events-none disabled:opacity-100",
              active
                ? tone === "onBrand"
                  ? "bg-white text-brand-dark"
                  : "bg-brand text-white"
                : tone === "onBrand"
                  ? "text-white/70 hover:text-white"
                  : "text-muted hover:text-foreground",
            )}
          >
            {SHORT[locale]}
          </button>
        );
      })}
    </div>
  );
}
