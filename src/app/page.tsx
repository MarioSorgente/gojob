import Link from "next/link";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  { icon: "📝", title: "Post a job", text: "Role, area, salary, experience — 60 seconds." },
  { icon: "⚡", title: "See matches instantly", text: "A ranked shortlist of available candidates." },
  { icon: "🤝", title: "Invite & match", text: "Chat opens only on mutual interest." },
  { icon: "✅", title: "Interview & hire", text: "Schedule, then mark as hired." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/login" className="text-sm font-semibold text-brand">
          Log in
        </Link>
      </header>

      <main className="flex-1">
        <section className="pt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
            🌴 Made for Bali hospitality
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
            Post a job. Instantly see the best available candidates.
          </h1>
          <p className="mt-3 text-base text-muted">
            GoJob replaces Instagram DMs and WhatsApp CVs with one simple hiring
            marketplace for cafés, restaurants, bars, hotels and beach clubs.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink href="/register?role=employer" size="lg" className="w-full">
              I&apos;m hiring →
            </ButtonLink>
            <ButtonLink
              href="/register?role=candidate"
              size="lg"
              variant="outline"
              className="w-full"
            >
              I&apos;m looking for work
            </ButtonLink>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            How it works
          </h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="font-semibold">
                    <span className="text-brand">{i + 1}.</span> {s.title}
                  </p>
                  <p className="text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-muted">
        Free for candidates · Built for Bali hospitality
      </footer>
    </div>
  );
}
