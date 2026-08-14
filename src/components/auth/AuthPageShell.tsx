import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Icon } from "@/components/Icon";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function AuthPageShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { locale, t } = await getI18n();

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(32rem,1fr)]">
      <section className="hidden bg-brand-dark px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-brand-dark"
          >
            <Logo size="lg" className="[&>span:last-child]:text-white" />
            <span className="sr-only">{t("auth.backToHome")}</span>
          </Link>
          <LocaleSwitcher current={locale} tone="onBrand" />
        </div>
        <div className="my-auto max-w-lg py-16">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            {t("common.builtForBali")}
          </span>
          <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            {t("auth.panelTitle")}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-white/75">
            {t("auth.panelText")}
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3" aria-hidden="true">
            {[
              t("auth.panelStep1"),
              t("auth.panelStep2"),
              t("auth.panelStep3"),
            ].map((label, index) => (
              <div
                key={label}
                className="rounded-card border border-white/15 bg-white/10 p-4"
              >
                <span className="text-xs font-bold text-white/70">
                  0{index + 1}
                </span>
                <p className="mt-5 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/60">{t("auth.panelFooter")}</p>
      </section>

      <section className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-10 lg:justify-center lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link
              href="/"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Logo size="lg" />
              <span className="sr-only">{t("auth.backToHome")}</span>
            </Link>
            <LocaleSwitcher current={locale} />
          </div>
          <Link
            href="/"
            className="mb-8 mt-8 hidden w-fit items-center gap-1.5 rounded text-sm font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40 lg:inline-flex"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            {t("auth.backToHome")}
          </Link>
          <div className="mt-auto pt-10 lg:mt-0 lg:pt-0">
            <h1 className="type-display">{title}</h1>
            <p className="mb-7 mt-2 text-sm leading-6 text-muted">{description}</p>
            <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
              {children}
            </div>
            <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          </div>
          <div className="mt-auto h-12 lg:hidden" />
        </div>
      </section>
    </main>
  );
}
