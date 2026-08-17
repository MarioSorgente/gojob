export const runtime = "nodejs";
export const maxDuration = 300;

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainRecommendationQueue } from "@/lib/recommendationQueue";

function hasSecret(actualValue: string, expectedValue: string | undefined) {
  if (!expectedValue) return false;
  const actual = Buffer.from(actualValue);
  const expected = Buffer.from(expectedValue);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return hasSecret(
    request.headers.get("authorization") ?? "",
    secret ? `Bearer ${secret}` : undefined,
  );
}

/** Vercel Cron repeatedly drains bounded batches from the durable Firestore queue. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await drainRecommendationQueue());
}

/** Cloud Tasks push target; unlike Vercel Cron this can run immediately. */
export async function POST(request: Request) {
  if (
    !hasSecret(
      request.headers.get("x-gojob-worker-secret") ?? "",
      process.env.RECOMMENDATION_WORKER_SECRET,
    )
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await drainRecommendationQueue());
}
