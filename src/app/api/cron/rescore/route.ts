/**
 * Nightly shortlist re-score.
 *
 * Per-write resync (lib/repos/rematch.ts) keeps shortlists fresh in the normal
 * case, but it runs off the response and can be lost — a deploy mid-flight, a
 * timeout, a bug in a new code path. This sweep is the backstop that makes
 * staleness self-healing rather than permanent: it regenerates every live job's
 * shortlist from scratch, preserving pipeline state as generateShortlist does.
 *
 * Scheduled from vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`
 * when that variable is set; without it configured the route refuses to run
 * rather than leaving an unauthenticated, expensive endpoint exposed.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generateShortlist, listLiveJobs } from "@/lib/repos/jobs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const jobs = await listLiveJobs();

  let rescored = 0;
  const failures: { jobId: string; error: string }[] = [];

  // Sequential on purpose: this competes with live traffic for Firestore
  // throughput, and finishing slowly is better than throttling the app.
  for (const job of jobs) {
    try {
      await generateShortlist(job);
      rescored++;
    } catch (error) {
      failures.push({
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const result = {
    ok: failures.length === 0,
    liveJobs: jobs.length,
    rescored,
    failures,
    durationMs: Date.now() - started,
  };
  if (failures.length > 0) console.error("Nightly re-score had failures", result);

  return NextResponse.json(result);
}
