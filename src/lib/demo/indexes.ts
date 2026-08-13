/**
 * Create the Firestore indexes this app needs, from the browser.
 *
 * `firestore.indexes.json` is the source of truth, but declaring an index does
 * nothing until it is deployed — normally `firebase deploy --only
 * firestore:indexes`, which needs the CLI. This calls the Firestore Admin REST
 * API directly with the service-account credentials the deployment already
 * holds, so the no-terminal setup path stays complete.
 *
 * Idempotent: an index that already exists comes back as ALREADY_EXISTS and is
 * reported as such rather than treated as a failure.
 */

import type { App } from "firebase-admin/app";

const API = "https://firestore.googleapis.com/v1";

interface IndexField {
  fieldPath: string;
  order?: "ASCENDING" | "DESCENDING";
  arrayConfig?: "CONTAINS";
}

interface CompositeIndex {
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  fields: IndexField[];
}

/**
 * Mirrors firestore.indexes.json. Kept as a literal rather than importing the
 * JSON so this file states exactly what it will create in the user's project.
 */
const COMPOSITE_INDEXES: CompositeIndex[] = [
  {
    collectionGroup: "jobs",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "jobs",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "role", order: "ASCENDING" },
    ],
  },
  {
    collectionGroup: "conversations",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "participants", arrayConfig: "CONTAINS" },
      { fieldPath: "lastMessageAt", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "candidates",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "profileStrength", order: "DESCENDING" },
      { fieldPath: "userId", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "candidates",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "roles", arrayConfig: "CONTAINS" },
      { fieldPath: "profileStrength", order: "DESCENDING" },
      { fieldPath: "userId", order: "DESCENDING" },
    ],
  },
  {
    collectionGroup: "shortlist",
    queryScope: "COLLECTION_GROUP",
    fields: [
      { fieldPath: "businessId", order: "ASCENDING" },
      { fieldPath: "employerAction", order: "ASCENDING" },
    ],
  },
];

/**
 * Single-field exemptions. Firestore auto-indexes single fields only at
 * COLLECTION scope, so every collection-group equality filter needs one of
 * these or the query fails with FAILED_PRECONDITION.
 */
const FIELD_OVERRIDES = [
  {
    collectionGroup: "shortlist",
    fieldPath: "candidateId",
    indexConfig: {
      indexes: [
        { queryScope: "COLLECTION", fields: [{ fieldPath: "candidateId", order: "ASCENDING" }] },
        { queryScope: "COLLECTION", fields: [{ fieldPath: "candidateId", order: "DESCENDING" }] },
        { queryScope: "COLLECTION", fields: [{ fieldPath: "candidateId", arrayConfig: "CONTAINS" }] },
        { queryScope: "COLLECTION_GROUP", fields: [{ fieldPath: "candidateId", order: "ASCENDING" }] },
      ],
    },
  },
];

export interface IndexOutcome {
  target: string;
  status: "created" | "already exists" | "failed";
  detail?: string;
}

export interface EnsureIndexesResult {
  projectId: string;
  results: IndexOutcome[];
  /** Indexes build asynchronously; queries keep failing until they finish. */
  note: string;
}

async function accessToken(app: App): Promise<string> {
  // The credential attached to the Admin app already carries the right scopes
  // (cloud-platform / datastore) — no second set of secrets to configure.
  const token = await app.options.credential?.getAccessToken();
  if (!token?.access_token) throw new Error("Could not obtain an access token");
  return token.access_token;
}

async function post(
  url: string,
  token: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

function describe(index: CompositeIndex): string {
  const fields = index.fields
    .map((f) => `${f.fieldPath}${f.arrayConfig ? " (array)" : f.order === "DESCENDING" ? " desc" : ""}`)
    .join(" + ");
  return `${index.collectionGroup} [${index.queryScope}]: ${fields}`;
}

export async function ensureIndexes(
  app: App,
  projectId: string,
): Promise<EnsureIndexesResult> {
  const token = await accessToken(app);
  const base = `${API}/projects/${projectId}/databases/(default)/collectionGroups`;
  const results: IndexOutcome[] = [];

  for (const index of COMPOSITE_INDEXES) {
    const target = describe(index);
    try {
      const res = await post(
        `${base}/${index.collectionGroup}/indexes`,
        token,
        { queryScope: index.queryScope, fields: index.fields },
      );
      if (res.ok) {
        results.push({ target, status: "created" });
      } else if (res.status === 409 || /ALREADY_EXISTS/i.test(res.text)) {
        results.push({ target, status: "already exists" });
      } else {
        results.push({ target, status: "failed", detail: res.text.slice(0, 300) });
      }
    } catch (error) {
      results.push({
        target,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const override of FIELD_OVERRIDES) {
    const target = `${override.collectionGroup}.${override.fieldPath} [single-field, collection group]`;
    try {
      // Field overrides are updated, not created — the field always exists.
      const url =
        `${base}/${override.collectionGroup}/fields/${override.fieldPath}` +
        `?updateMask=indexConfig`;
      const res = await post(url, token, { indexConfig: override.indexConfig }, "PATCH");
      results.push(
        res.ok
          ? { target, status: "created" }
          : { target, status: "failed", detail: res.text.slice(0, 300) },
      );
    } catch (error) {
      results.push({
        target,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    projectId,
    results,
    note:
      "Indexes build in the background — a large collection can take several " +
      "minutes. Queries keep failing until building completes; the app falls " +
      "back to slower index-free paths in the meantime, so it stays usable.",
  };
}
