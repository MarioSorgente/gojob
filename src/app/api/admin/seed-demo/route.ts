/**
 * Demo data endpoint — seeds, resets and inspects the demo marketplace using the
 * Firebase credentials this deployment already holds. Lets a hosted environment
 * be populated from the browser with no terminal and no service-account file.
 *
 * Off by default. Two gates, both required:
 *   ENABLE_DEMO_TOOLS=1   feature flag. Absent -> this route 404s. Deleting the
 *                         variable is the kill switch; no redeploy needed.
 *   DEMO_SEED_TOKEN=…     shared secret sent in the request body.
 *
 * An admin session works in place of the token. The token exists because of the
 * chicken-and-egg: on an empty database there is no admin user yet, and the app
 * has no UI for becoming one.
 */

export const runtime = "nodejs";
// Seeding writes ~40 documents plus auth users; the default timeout is too
// tight to rely on for a cold start against a real Firebase project.
export const maxDuration = 60;

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb, getAdminApp } from "@/lib/firebase/admin";
import { ensureIndexes, indexHealth } from "@/lib/demo/indexes";
import {
  credentialSource,
  isEmulator,
  projectIdFromEnv,
} from "@/lib/firebase/credentials";
import { getSessionUser } from "@/lib/auth";
import {
  grantRole,
  runReset,
  runSeed,
  runStatus,
  type DemoCtx,
} from "@/lib/demo/seed";

const RESET_CONFIRMATION = "DELETE-DEMO-DATA";

function enabled(): boolean {
  return process.env.ENABLE_DEMO_TOOLS === "1";
}

/** Constant-time compare that tolerates length mismatch without leaking it. */
function tokenMatches(supplied: unknown): boolean {
  const expected = process.env.DEMO_SEED_TOKEN;
  if (!expected || typeof supplied !== "string") return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function authorized(token: unknown): Promise<boolean> {
  if (tokenMatches(token)) return true;
  const user = await getSessionUser();
  return user?.role === "admin";
}

export async function GET() {
  if (!enabled()) return new NextResponse("Not found", { status: 404 });
  // Deliberately says nothing about the project or its data without the token.
  return NextResponse.json({ enabled: true });
}

export async function POST(request: Request) {
  if (!enabled()) return new NextResponse("Not found", { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Expected a JSON body" },
      { status: 400 },
    );
  }

  if (!(await authorized(body.token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = body.action;
  const ctx: DemoCtx = { db: adminDb(), auth: adminAuth() };
  const projectId = projectIdFromEnv();

  try {
    switch (action) {
      case "status": {
        const [result, indexes] = await Promise.all([
          runStatus(ctx, {
            projectId,
            credentialSource: credentialSource(),
            emulator: isEmulator(),
          }),
          indexHealth(getAdminApp(), projectId),
        ]);
        return NextResponse.json({ ok: true, action, ...result, indexes });
      }

      case "seed": {
        const result = await runSeed(ctx, projectId);
        return NextResponse.json({ ok: true, action, ...result });
      }

      case "create-indexes": {
        // Declaring indexes in firestore.indexes.json does nothing until they
        // are deployed, which normally needs the Firebase CLI. This does it
        // over the Admin REST API with the credentials already configured.
        const result = await ensureIndexes(getAdminApp(), projectId);
        return NextResponse.json({ ok: true, action, ...result });
      }

      case "reset": {
        if (body.confirm !== RESET_CONFIRMATION) {
          return NextResponse.json(
            {
              error: `Destructive action — send confirm: "${RESET_CONFIRMATION}"`,
            },
            { status: 400 },
          );
        }
        const result = await runReset(ctx);
        return NextResponse.json({ ok: true, action, ...result });
      }

      case "grant-role": {
        const { email, role } = body;
        if (typeof email !== "string" || !email) {
          return NextResponse.json(
            { error: "email is required" },
            { status: 400 },
          );
        }
        if (role !== "admin" && role !== "employer" && role !== "candidate") {
          return NextResponse.json(
            { error: "role must be admin, employer or candidate" },
            { status: 400 },
          );
        }
        const result = await grantRole(ctx, email, role);
        return NextResponse.json({ ok: true, action, ...result });
      }

      default:
        return NextResponse.json(
          {
            error:
              "action must be one of: status, create-indexes, seed, reset, grant-role",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    // Surface the real message: this endpoint exists to diagnose a deployment,
    // and it is already behind two gates.
    console.error(`seed-demo ${String(action)} failed`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        projectId,
      },
      { status: 500 },
    );
  }
}
