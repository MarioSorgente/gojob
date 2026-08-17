import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminApp } from "./firebase/admin";

/**
 * Ask Google Cloud Tasks to invoke the recommendation worker immediately.
 *
 * Firestore remains the source-of-truth queue. Cloud Tasks is only the durable
 * delivery mechanism, so a dispatch outage cannot lose work: the daily Hobby-
 * compatible cron will pick up any task that was not pushed successfully.
 */
export async function dispatchRecommendationWorker(): Promise<void> {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.FIREBASE_ADMIN_PROJECT_ID;
  const location = process.env.RECOMMENDATION_TASKS_LOCATION;
  const queue = process.env.RECOMMENDATION_TASKS_QUEUE;
  const workerUrl = process.env.RECOMMENDATION_WORKER_URL;
  const secret = process.env.RECOMMENDATION_WORKER_SECRET;

  if (!project || !location || !queue || !workerUrl || !secret) return;

  const credential = getAdminApp().options.credential;
  if (!credential) throw new Error("Firebase Admin credential is unavailable");
  const { access_token: accessToken } = await credential.getAccessToken();
  const parent = `projects/${project}/locations/${location}/queues/${queue}`;
  const endpoint = `https://cloudtasks.googleapis.com/v2/${parent}/tasks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      task: {
        name: `${parent}/tasks/recommendations-${randomUUID()}`,
        httpRequest: {
          httpMethod: "POST",
          url: workerUrl,
          headers: {
            "content-type": "application/json",
            "x-gojob-worker-secret": secret,
          },
          body: Buffer.from("{}").toString("base64"),
        },
      },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(
      `Cloud Tasks dispatch failed (${response.status}): ${detail}`,
    );
  }
}
