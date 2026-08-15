"use client";

import { useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  confirmPhoneCode,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  startPhoneSignIn,
} from "@/lib/firebase/auth-client";
import type { ConfirmationResult } from "firebase/auth";
import { Alert, Button, Field, Input, Spinner, interactive } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";

type Method = "email" | "phone";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useT();
  const params = useSearchParams();
  const role = params.get("role");
  const nextParam = params.get("next");

  // Where to go after auth. A `next` (e.g. from a shared job link) is carried
  // through onboarding so the application continues where it left off (§20).
  const onboardingQuery = new URLSearchParams();
  if (role) onboardingQuery.set("role", role);
  if (nextParam) onboardingQuery.set("next", nextParam);
  const query = onboardingQuery.toString();
  const next = `/onboarding${query ? `?${query}` : ""}`;

  const [method, setMethod] = useState<Method>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  /**
   * Leave for `next` with a **full page load**, not `router.replace`.
   *
   * Signing in changes what every server component renders, but a soft
   * navigation leaves the pre-login RSC payloads in the client router cache —
   * and Next restores those on Back/Forward regardless of staleness. That is
   * why pressing Back after login used to land on a landing page still showing
   * "Log in", indistinguishable from having been signed out. One full load at
   * sign-in — a once-per-session event — re-renders everything with the session
   * cookie present.
   *
   * `replace`, not `assign`: the login form must not stay in the back stack.
   * With `assign` it did, and because /login redirects an authenticated visitor
   * to their dashboard, pressing Back bounced straight forward again — Back
   * appeared to do nothing. Replacing the entry means Back returns to whatever
   * the user was looking at before they started signing in.
   *
   * The Next lint rule that prefers a soft navigation only flags `assign`, so
   * no suppression is needed here — but the reasoning is the same either way.
   */
  const go = () => window.location.replace(next);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(t(authErrorKey(e), { message: (e as Error)?.message ?? "" }));
      setBusy(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (mode === "register") {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      go();
    });
  }

  async function google() {
    await run(async () => {
      await loginWithGoogle();
      go();
    });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const conf = await startPhoneSignIn(phone, "recaptcha-container");
      setConfirmation(conf);
      setBusy(false);
    });
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    await run(async () => {
      await confirmPhoneCode(confirmation, code);
      go();
    });
  }

  return (
    <div>
      <MethodTabs value={method} onChange={setMethod}>
        {method === "email" ? (
          <form onSubmit={submitEmail} className="space-y-3">
            {mode === "register" && (
              <Field label={t("auth.fullName")}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.fullNamePlaceholder")}
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label={t("auth.email")}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label={t("auth.password")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {busy
                ? t("common.pleaseWait")
                : mode === "register"
                  ? t("auth.createAccount")
                  : t("common.logIn")}
            </Button>
          </form>
        ) : !confirmation ? (
          <form onSubmit={sendCode} className="space-y-3">
            <Field label={t("auth.phone")} hint={t("auth.phoneHint")}>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62…"
                autoComplete="tel"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {busy ? t("auth.sending") : t("auth.sendCode")}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <Field label={t("auth.code")}>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {busy ? t("auth.verifying") : t("auth.verify")}
            </Button>
          </form>
        )}
      </MethodTabs>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        {t("auth.or")}
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={google} disabled={busy}>
        {/* An inline mark rather than the previous "🇬" — that's a lone regional
            indicator, which renders as a hollow letter box on Windows and
            Android instead of a G. */}
        <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4">
          <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.6z" />
          <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
          <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
        </svg>
        {t("auth.google")}
      </Button>

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <div id="recaptcha-container" />
    </div>
  );
}

/**
 * A real tab pattern.
 *
 * The previous version put `role="tab"` on two buttons with no `tablist`, no
 * `tabpanel` and no arrow-key handling — announced by screen readers as tabs
 * that don't behave like tabs, which is worse than plain buttons.
 */
function MethodTabs({
  value,
  onChange,
  children,
}: {
  value: Method;
  onChange: (m: Method) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const baseId = useId();
  const refs = useRef<Record<Method, HTMLButtonElement | null>>({
    email: null,
    phone: null,
  });
  const methods: Method[] = ["email", "phone"];
  const labels: Record<Method, DictionaryKey> = {
    email: "auth.methodEmail",
    phone: "auth.methodPhone",
  };

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const nextMethod =
      methods[(methods.indexOf(value) + delta + methods.length) % methods.length];
    onChange(nextMethod);
    refs.current[nextMethod]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={t("common.logIn")}
        onKeyDown={onKeyDown}
        className="mb-4 flex gap-2"
      >
        {methods.map((method) => {
          const active = method === value;
          return (
            <button
              key={method}
              ref={(el) => {
                refs.current[method] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${method}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(method)}
              className={cn(
                "min-h-11 flex-1 rounded-control px-3 text-sm font-semibold",
                interactive,
                active
                  ? "bg-brand-soft text-brand-dark"
                  : "bg-surface-muted text-muted hover:text-foreground",
              )}
            >
              {t(labels[method])}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${value}`}
      >
        {children}
      </div>
    </>
  );
}

function authErrorKey(e: unknown): DictionaryKey {
  switch ((e as { code?: string })?.code ?? "") {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "auth.errBadCredentials";
    case "auth/email-already-in-use":
      return "auth.errEmailInUse";
    case "auth/weak-password":
      return "auth.errWeakPassword";
    case "auth/invalid-email":
      return "auth.errInvalidEmail";
    case "auth/invalid-phone-number":
      return "auth.errInvalidPhone";
    case "auth/invalid-verification-code":
      return "auth.errInvalidCode";
    default:
      return "common.somethingWentWrong";
  }
}
