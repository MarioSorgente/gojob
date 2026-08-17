import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
}));

vi.mock("./firebase/admin", () => ({
  getAdminApp: () => ({
    options: { credential: { getAccessToken: mocks.getAccessToken } },
  }),
}));

import { dispatchRecommendationWorker } from "./recommendationDispatch";

const names = [
  "GOOGLE_CLOUD_PROJECT",
  "FIREBASE_PROJECT_ID",
  "RECOMMENDATION_TASKS_LOCATION",
  "RECOMMENDATION_TASKS_QUEUE",
  "RECOMMENDATION_WORKER_URL",
  "RECOMMENDATION_WORKER_SECRET",
] as const;
const original = Object.fromEntries(
  names.map((name) => [name, process.env[name]]),
);

describe("dispatchRecommendationWorker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    names.forEach((name) => delete process.env[name]);
  });

  afterEach(() => {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("does nothing when Cloud Tasks is not configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await dispatchRecommendationWorker();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("creates an authenticated immediate HTTP task", async () => {
    process.env.FIREBASE_PROJECT_ID = "gojob-prod";
    process.env.RECOMMENDATION_TASKS_LOCATION = "europe-west1";
    process.env.RECOMMENDATION_TASKS_QUEUE = "recommendations";
    process.env.RECOMMENDATION_WORKER_URL =
      "https://gojob.example/api/cron/recommendations";
    process.env.RECOMMENDATION_WORKER_SECRET = "worker-secret";
    mocks.getAccessToken.mockResolvedValue({
      access_token: "google-token",
      expires_in: 3600,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await dispatchRecommendationWorker();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      "https://cloudtasks.googleapis.com/v2/projects/gojob-prod/locations/europe-west1/queues/recommendations/tasks",
    );
    expect(init?.headers).toMatchObject({
      authorization: "Bearer google-token",
    });
    const payload = JSON.parse(String(init?.body));
    expect(payload.task.httpRequest).toMatchObject({
      httpMethod: "POST",
      url: "https://gojob.example/api/cron/recommendations",
      headers: { "x-gojob-worker-secret": "worker-secret" },
    });
  });
});
