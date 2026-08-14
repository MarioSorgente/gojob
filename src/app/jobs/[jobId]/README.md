# Why this route has no `loading.tsx`

`loading.tsx` wraps the segment in a Suspense boundary, which makes Next stream
the response: the shell is flushed with **status 200** before the page body
runs. `notFound()` then cannot change the status, so a closed or deleted job
answered `200 OK` with not-found content.

This is the public, crawlable, shareable job page (scope §20) — links to it live
on Instagram and WhatsApp and outlive the job. Search engines and link
unfurlers need a real `404`, and the page only awaits a single `getJob()`, so a
skeleton bought very little.

The in-app equivalent at `/candidate/jobs/[jobId]` *does* keep its `loading.tsx`:
it is authenticated, never crawled, and awaits three calls, so the skeleton is
worth more there than the status code.
