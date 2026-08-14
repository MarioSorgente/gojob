import Link from "next/link";
import { Logo } from "@/components/brand";
import { BfcacheGuard } from "@/components/BfcacheGuard";
import { Icon, type IconName } from "@/components/Icon";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ButtonLink } from "@/components/ui";
import { getSessionUser, homePathFor } from "@/lib/auth";
import { getI18n, getT } from "@/lib/i18n/server";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import type { Metadata } from "next";

/**
 * The landing page reads the session.
 *
 * It used to be statically prerendered with a hardcoded "Log in" link, so a
 * signed-in user pressing Back after login landed on a page that looked exactly
 * like being signed out. Reading the session makes this route dynamic, which is
 * the point: the header has to reflect who is actually here.
 */

export async function generateMetadata(): Promise<Metadata> {
  // The landing page is the one route where the title should follow the
  // visitor's language rather than the crawler-facing default.
  const t = await getT();
  return {
    title: { absolute: `GoJob — ${t("landing.metaTitle")}` },
    description: t("landing.metaDescription"),
  };
}

const STEPS: { icon: IconName; title: DictionaryKey; text: DictionaryKey }[] = [
  { icon: "plus", title: "landing.step1Title", text: "landing.step1Text" },
  { icon: "sparkle", title: "landing.step2Title", text: "landing.step2Text" },
  { icon: "chat", title: "landing.step3Title", text: "landing.step3Text" },
  { icon: "checkBadge", title: "landing.step4Title", text: "landing.step4Text" },
];

export default async function LandingPage() {
  const [user, { locale, t }] = await Promise.all([getSessionUser(), getI18n()]);
  const homeHref = user ? homePathFor(user) : null;
  const firstName = user?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="min-h-dvh overflow-hidden bg-background">
      <BfcacheGuard />

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Logo />
          <nav
            className="flex items-center gap-3 sm:gap-5"
            aria-label={t("nav.mainNavigation")}
          >
            <a
              href="#how-it-works"
              className="hidden text-sm font-medium text-muted hover:text-foreground sm:block"
            >
              {t("landing.howItWorks")}
            </a>
            <LocaleSwitcher current={locale} />
            {homeHref ? (
              <ButtonLink href={homeHref} size="sm">
                {t("common.dashboard")}
                <Icon name="arrowRight" className="h-4 w-4" />
              </ButtonLink>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-1 py-1 text-sm font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t("common.logIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-soft/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
                <Icon name="star" className="h-3.5 w-3.5" />
                {t("landing.badge")}
              </span>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {t("landing.title")}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
                {t("landing.subtitle")}
              </p>

              {homeHref ? (
                // Signed in: one obvious way forward, and an unmistakable signal
                // that the session is intact.
                <div className="mt-7">
                  <p className="mb-3 text-sm font-semibold">
                    {firstName
                      ? t("landing.welcomeBack", { name: firstName })
                      : t("landing.signedInHint")}
                  </p>
                  <ButtonLink href={homeHref} size="lg" className="w-full sm:w-auto sm:min-w-52">
                    {t("common.dashboard")}
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ButtonLink
                      href="/register?role=employer"
                      size="lg"
                      className="w-full sm:w-auto sm:min-w-40"
                    >
                      {t("landing.ctaEmployer")}
                      <Icon name="arrowRight" className="h-4 w-4" />
                    </ButtonLink>
                    <ButtonLink
                      href="/register?role=candidate"
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {t("landing.ctaCandidate")}
                    </ButtonLink>
                  </div>
                  <p className="mt-4 text-xs font-medium text-muted">
                    {t("landing.reassurance")}
                  </p>
                </>
              )}
            </div>

            <div className="relative hidden lg:block" aria-hidden="true">
              <div className="absolute -top-8 left-8 inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-raised">
                <Icon name="sparkle" className="h-4 w-4" />
                {t("landing.previewCount")}
              </div>
              <div className="ml-8 rounded-panel border border-border bg-surface p-6 shadow-overlay">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="type-eyebrow text-brand">
                      {t("landing.previewTitle")}
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {t("landing.previewSubtitle")}
                    </p>
                  </div>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                    {t("landing.previewLive")}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["AP", "Ayu Pratiwi", t("landing.previewDetail1"), "96%"],
                    ["KD", "Kadek Dwi", t("landing.previewDetail2"), "92%"],
                    ["NS", "Ni Luh Sari", t("landing.previewDetail3"), "89%"],
                  ].map(([initials, name, detail, score], index) => (
                    <div
                      key={name}
                      className={`flex items-center gap-3 rounded-card border p-4 ${index === 0 ? "border-brand/30 bg-brand-soft/30" : "border-border"}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{name}</p>
                        <p className="truncate text-sm text-muted">{detail}</p>
                      </div>
                      <span className="font-bold text-brand-dark">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-5 right-6 rounded-card border border-border bg-surface px-4 py-3 shadow-raised">
                <p className="text-xs text-muted">{t("landing.previewNext")}</p>
                <p className="text-sm font-bold">
                  {t("landing.previewNextAction")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="max-w-xl">
              <p className="type-eyebrow text-brand">{t("landing.howItWorks")}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.howItWorksTitle")}
              </h2>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 rounded-card border border-border bg-background p-4 lg:block lg:min-h-48 lg:p-5"
                >
                  <div className="flex items-center justify-between lg:w-full">
                    <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-soft text-brand-dark">
                      <Icon name={step.icon} />
                    </span>
                    <span className="hidden text-sm font-bold text-brand lg:block">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="lg:mt-8">
                    <p className="font-semibold">
                      <span className="text-brand lg:hidden">{index + 1}. </span>
                      {t(step.title)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {t(step.text)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-center text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:text-left lg:px-10">
        <Logo size="sm" />
        <p>
          {t("common.freeForCandidates")} · {t("common.builtForBali")}
        </p>
      </footer>
    </div>
  );
}
