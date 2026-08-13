import Link from "next/link";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  {
    icon: "📝",
    title: "Post a job",
    text: "Role, area, salary, experience — 60 seconds.",
  },
  {
    icon: "⚡",
    title: "See matches instantly",
    text: "A ranked shortlist of available candidates.",
  },
  {
    icon: "🤝",
    title: "Invite & match",
    text: "Chat opens only on mutual interest.",
  },
  {
    icon: "✅",
    title: "Interview & hire",
    text: "Schedule, then mark as hired.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-background">
      <header className="border-b border-border/70 bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Logo />
          <nav className="flex items-center gap-5" aria-label="Main navigation">
            <a
              href="#how-it-works"
              className="hidden text-sm font-medium text-muted hover:text-foreground sm:block"
            >
              How it works
            </a>
            <Link
              href="/login"
              className="text-sm font-semibold text-brand hover:text-brand-dark"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-soft/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
                🌴 Made for Bali hospitality
              </span>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Great hospitality hires, without the inbox chaos.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Post a role and instantly meet the best available local talent
                for cafés, restaurants, bars, hotels, and beach clubs.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink
                  href="/register?role=employer"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-40"
                >
                  I&apos;m hiring →
                </ButtonLink>
                <ButtonLink
                  href="/register?role=candidate"
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  I&apos;m looking for work
                </ButtonLink>
              </div>
              <p className="mt-4 text-xs font-medium text-muted">
                Free for candidates · Profiles take just a minute
              </p>
            </div>

            <div
              className="relative hidden lg:block"
              aria-label="Example GoJob candidate matches"
            >
              <div className="absolute -left-5 top-14 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg">
                12 matches found ⚡
              </div>
              <div className="ml-8 rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-slate-300/40">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand">
                      Your top matches
                    </p>
                    <p className="mt-1 text-lg font-bold">Barista · Canggu</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Live
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["AP", "Ayu Pratiwi", "4 years experience", "96%"],
                    ["KD", "Kadek Dwi", "Available immediately", "92%"],
                    ["NS", "Ni Luh Sari", "Speaks English", "89%"],
                  ].map(([initials, name, detail, score], index) => (
                    <div
                      key={name}
                      className={`flex items-center gap-3 rounded-2xl border p-4 ${index === 0 ? "border-brand/30 bg-brand-soft/30" : "border-border"}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
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
              <div className="absolute -bottom-5 right-6 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg">
                <p className="text-xs text-muted">Next step</p>
                <p className="text-sm font-bold">Invite to chat →</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="max-w-xl">
              <p className="text-sm font-bold uppercase tracking-wide text-brand">
                How it works
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                From open role to great hire, simply.
              </h2>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 lg:block lg:min-h-48 lg:p-5"
                >
                  <div className="flex items-center justify-between lg:w-full">
                    <span className="text-2xl" aria-hidden="true">
                      {step.icon}
                    </span>
                    <span className="hidden text-sm font-bold text-brand lg:block">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="lg:mt-8">
                    <p className="font-semibold">
                      <span className="text-brand lg:hidden">
                        {index + 1}.{" "}
                      </span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {step.text}
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
        <p>Free for candidates · Built for Bali hospitality</p>
      </footer>
    </div>
  );
}
