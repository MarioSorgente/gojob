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
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

type Method = "email" | "phone";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role");
  const next =
    params.get("next") || (role ? `/onboarding?role=${role}` : "/onboarding");

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
        <span className="text-base">🇬</span> Continue with Google
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
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
        active ? "bg-brand-soft text-brand-dark" : "bg-slate-100 text-slate-500",
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
