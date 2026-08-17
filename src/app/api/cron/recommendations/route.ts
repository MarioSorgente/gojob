export const runtime = "nodejs";
export const maxDuration = 300;

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainRecommendationQueue } from "@/lib/recommendationQueue";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Vercel Cron repeatedly drains bounded batches from the durable Firestore queue. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await drainRecommendationQueue());
}
