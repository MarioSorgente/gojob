"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type Action = "status" | "create-indexes" | "seed" | "reset" | "grant-role";

const RESET_CONFIRMATION = "DELETE-DEMO-DATA";

export function SetupPanel() {
  // Kept in component state, never in the URL — a token in a query string ends
  // up in browser history and the host's access logs.
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: Action, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, ...extra }),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Not JSON (e.g. a 404 from the feature flag) — show it raw.
      }
      setFailed(!res.ok);
      setResult(`HTTP ${res.status}\n\n${pretty}`);
    } catch (e) {
      setFailed(true);
      setResult(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function confirmReset() {
    const ok = window.confirm(
      "Delete all seeded demo data?\n\nSeeded documents and the three demo " +
        "accounts are removed. Accounts you registered yourself are kept.",
    );
    if (ok) void run("reset", { confirm: RESET_CONFIRMATION });
  }

  const disabled = !token || busy !== null;

  return (
    <div className="mt-5 space-y-4">
      <Card className="p-4">
        <Field
          label="Setup token"
          hint="The DEMO_SEED_TOKEN value from your hosting environment."
        >
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token"
            autoComplete="off"
          />
        </Field>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" disabled={disabled} onClick={() => void run("status")}>
            {busy === "status" ? "Checking…" : "Check status"}
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => void run("create-indexes")}
          >
            {busy === "create-indexes" ? "Creating…" : "Create indexes"}
          </Button>
          <Button disabled={disabled} onClick={() => void run("seed")}>
            {busy === "seed" ? "Seeding…" : "Seed demo data"}
          </Button>
          <Button variant="danger" disabled={disabled} onClick={confirmReset}>
            {busy === "reset" ? "Resetting…" : "Reset demo data"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Check status first — it reports which Firebase project this deployment is
          actually writing to. Then create indexes: several queries need them and
          fail until they exist. Indexes build in the background and can take a
          few minutes. Seeding is idempotent, so it is safe to re-run.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Grant a role
        </h2>
        <p className="mt-1 text-xs text-muted">
          Promotes an account that already exists. Sign up normally first, then
          use this — there is no other way to reach <code>/admin</code>.
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Account email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
            />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">admin</option>
              <option value="employer">employer</option>
              <option value="candidate">candidate</option>
            </Select>
          </Field>
          <Button
            variant="outline"
            disabled={disabled || !email}
            onClick={() => void run("grant-role", { email, role })}
          >
            {busy === "grant-role" ? "Granting…" : "Grant role"}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className={failed ? "border-red-200 p-4" : "p-4"}>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Result
          </h2>
          <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed">
            {result}
          </pre>
        </Card>
      )}
    </div>
  );
}
