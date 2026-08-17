# Recommendation queue deployment

Recommendation work is stored durably in Firestore. In production, Google
Cloud Tasks immediately pushes `POST /api/cron/recommendations`; the Vercel
Hobby cron runs only once per day as a recovery sweep for tasks whose dispatch
failed. Recommendation freshness therefore does not depend on a frequent
Vercel cron.

## Google Cloud setup

1. Enable the **Cloud Tasks API** in the Firebase/Google Cloud project.
2. Create a queue, for example:
   `gcloud tasks queues create gojob-recommendations --location=europe-west1`.
3. Grant the Firebase Admin service account the **Cloud Tasks Enqueuer** role
   (`roles/cloudtasks.enqueuer`).
4. Configure `RECOMMENDATION_TASKS_LOCATION`,
   `RECOMMENDATION_TASKS_QUEUE`, `RECOMMENDATION_WORKER_URL`, and a long random
   `RECOMMENDATION_WORKER_SECRET` in Vercel. The worker URL must be the public
   HTTPS URL ending in `/api/cron/recommendations`.

If Cloud Tasks is temporarily unavailable, enqueueing still succeeds because
the Firestore task is written first. The dispatch failure is emitted as the
`recommendation_dispatch_failure` metric, and the daily recovery invocation
will drain retained work.
