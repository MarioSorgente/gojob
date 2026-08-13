"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  confirmPhoneCode,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  startPhoneSignIn,
} from "@/lib/firebase/auth-client";
import type { ConfirmationResult } from "firebase/auth";
import { Button, Field, Input, interactive } from "@/components/ui";
import { cn } from "@/lib/cn";

type Method = "email" | "phone";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role");
  const nextParam = params.get("next");

  // Where to go after auth. A `next` (e.g. from a shared job link) is carried
  // through onboarding so the application continues where it left off (§20).
  const onboardingQuery = new URLSearchParams();
  if (role) onboardingQuery.set("role", role);
  if (nextParam) onboardingQuery.set("next", nextParam);
  const query = onboardingQuery.toString();
  const next = mode === "register" || role || nextParam
    ? `/onboarding${query ? `?${query}` : ""}`
    : "/onboarding";

  const [method, setMethod] = useState<Method>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const go = () => router.replace(next);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(humanizeAuthError(e));
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
      <div className="mb-4 flex gap-2">
        <MethodTab active={method === "email"} onClick={() => setMethod("email")}>
          Email
        </MethodTab>
        <MethodTab active={method === "phone"} onClick={() => setMethod("phone")}>
          Phone
        </MethodTab>
      </div>

      {method === "email" && (
        <form onSubmit={submitEmail} className="space-y-3">
          {mode === "register" && (
            <Field label="Full name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ayu Pratiwi"
                autoComplete="name"
                required
              />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
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
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Log in"}
          </Button>
        </form>
      )}

      {method === "phone" && (
        <div className="space-y-3">
          {!confirmation ? (
            <form onSubmit={sendCode} className="space-y-3">
              <Field label="Phone number" hint="Include country code, e.g. +6281234567890">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62…"
                  required
                />
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-3">
              <Field label="Verification code">
                <Input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify & continue"}
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        or
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
        Continue with Google
      </Button>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div id="recaptcha-container" />
    </div>
  );
}

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold",
        interactive,
        active
          ? "bg-brand-soft text-brand-dark"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function humanizeAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "That email already has an account. Try logging in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/invalid-phone-number":
      return "That phone number looks invalid. Include the country code.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please try again.";
    default:
      return (e as Error)?.message || "Something went wrong. Please try again.";
  }
}
