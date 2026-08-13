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
import {
  adminIndexRequests,
  type AdminCompositeIndex,
} from "./firestoreIndexConfig";

const API = "https://firestore.googleapis.com/v1";

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

export type IndexHealthStatus = "READY" | "BUILDING" | "MISSING" | "ERROR";
export type DatabaseIndexState = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

export interface IndexHealthDetail {
  kind: "composite" | "field";
  collectionGroup: string;
  fields: AdminCompositeIndex["fields"];
  queryScope: AdminCompositeIndex["queryScope"];
  status: IndexHealthStatus;
  detail?: string;
}

export interface IndexHealthResult {
  projectId: string;
  databaseState: DatabaseIndexState;
  indexes: IndexHealthDetail[];
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

async function getJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`Firestore Admin API ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Firestore Admin API returned malformed JSON");
  }
}

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function normalizedFields(
  value: unknown,
): AdminCompositeIndex["fields"] | null {
  if (!Array.isArray(value)) return null;
  const fields: AdminCompositeIndex["fields"] = [];
  for (const item of value) {
    const field = object(item);
    if (!field || typeof field.fieldPath !== "string") return null;
    // Firestore adds this tiebreaker to deployed composite definitions.
    if (field.fieldPath === "__name__") continue;
    if (field.order === "ASCENDING" || field.order === "DESCENDING") {
      fields.push({ fieldPath: field.fieldPath, order: field.order });
    } else if (field.arrayConfig === "CONTAINS") {
      fields.push({ fieldPath: field.fieldPath, arrayConfig: "CONTAINS" });
    } else return null;
  }
  return fields;
}

function signature(scope: unknown, fields: unknown): string | null {
  const normalized = normalizedFields(fields);
  if ((scope !== "COLLECTION" && scope !== "COLLECTION_GROUP") || !normalized)
    return null;
  return JSON.stringify({ queryScope: scope, fields: normalized });
}

function adminState(value: unknown): {
  status: IndexHealthStatus;
  detail?: string;
} {
  if (value === "READY") return { status: "READY" };
  if (value === "CREATING") return { status: "BUILDING" };
  if (typeof value === "string")
    return { status: "ERROR", detail: `Admin API state: ${value}` };
  return {
    status: "ERROR",
    detail: "Admin API response omitted the index state",
  };
}

/** Compare the canonical index file with definitions actually deployed in Firestore. */
export async function indexHealth(
  app: App,
  projectId: string,
  config?: unknown,
): Promise<IndexHealthResult> {
  const required = adminIndexRequests(config);
  const token = await accessToken(app);
  const base = `${API}/projects/${projectId}/databases/(default)/collectionGroups`;
  const results: IndexHealthDetail[] = [];

  const groups = [
    ...new Set(required.compositeIndexes.map((i) => i.collectionGroup)),
  ];
  const deployed = new Map<
    string,
    { status: IndexHealthStatus; detail?: string }
  >();
  for (const group of groups) {
    try {
      let pageToken: string | undefined;
      do {
        const url = `${base}/${encodeURIComponent(group)}/indexes${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`;
        const payload = object(await getJson(url, token));
        if (
          !payload ||
          (payload.indexes !== undefined && !Array.isArray(payload.indexes))
        )
          throw new Error(
            "Firestore Admin API returned a malformed index list",
          );
        for (const item of (payload.indexes as unknown[] | undefined) ?? []) {
          const index = object(item);
          const key = index && signature(index.queryScope, index.fields);
          if (!index || !key)
            throw new Error(
              "Firestore Admin API returned a malformed index definition",
            );
          deployed.set(`${group}:${key}`, adminState(index.state));
        }
        if (
          payload.nextPageToken !== undefined &&
          typeof payload.nextPageToken !== "string"
        )
          throw new Error(
            "Firestore Admin API returned a malformed page token",
          );
        pageToken = payload.nextPageToken as string | undefined;
      } while (pageToken);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      for (const index of required.compositeIndexes.filter(
        (i) => i.collectionGroup === group,
      ))
        deployed.set(`${group}:${signature(index.queryScope, index.fields)}`, {
          status: "ERROR",
          detail,
        });
    }
  }

  for (const index of required.compositeIndexes) {
    const found = deployed.get(
      `${index.collectionGroup}:${signature(index.queryScope, index.fields)}`,
    );
    results.push({
      kind: "composite",
      ...index,
      ...(found ?? { status: "MISSING" }),
    });
  }

  for (const override of required.fieldOverrides) {
    let payload: JsonObject | null = null;
    let failure: string | undefined;
    try {
      payload = object(
        await getJson(
          `${base}/${encodeURIComponent(override.collectionGroup)}/fields/${encodeURIComponent(override.fieldPath)}`,
          token,
        ),
      );
      if (
        !payload ||
        !object(payload.indexConfig) ||
        !Array.isArray(object(payload.indexConfig)?.indexes)
      )
        throw new Error(
          "Firestore Admin API returned a malformed field configuration",
        );
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    const deployedFields = object(payload?.indexConfig)?.indexes as
      unknown[] | undefined;
    for (const requiredIndex of override.indexConfig.indexes) {
      let state: { status: IndexHealthStatus; detail?: string } = {
        status: "MISSING",
      };
      if (failure) state = { status: "ERROR", detail: failure };
      else {
        const match = deployedFields?.find((item) => {
          const candidate = object(item);
          return (
            candidate &&
            signature(candidate.queryScope, candidate.fields) ===
              signature(requiredIndex.queryScope, requiredIndex.fields)
          );
        });
        if (match) state = adminState(object(match)?.state);
      }
      results.push({
        kind: "field",
        collectionGroup: override.collectionGroup,
        queryScope: requiredIndex.queryScope,
        fields: requiredIndex.fields,
        ...state,
      });
    }
  }

  const databaseState: DatabaseIndexState = results.some(
    (r) => r.status === "ERROR",
  )
    ? "UNHEALTHY"
    : results.every((r) => r.status === "READY")
      ? "HEALTHY"
      : "DEGRADED";
  return { projectId, databaseState, indexes: results };
}

function describe(index: AdminCompositeIndex): string {
  const fields = index.fields
    .map(
      (f) =>
        `${f.fieldPath}${f.arrayConfig ? " (array)" : f.order === "DESCENDING" ? " desc" : ""}`,
    )
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
  const { compositeIndexes, fieldOverrides } = adminIndexRequests();

  for (const index of compositeIndexes) {
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
        results.push({
          target,
          status: "failed",
          detail: res.text.slice(0, 300),
        });
      }
    } catch (error) {
      results.push({
        target,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const override of fieldOverrides) {
    const target = `${override.collectionGroup}.${override.fieldPath} [single-field, collection group]`;
    try {
      // Field overrides are updated, not created — the field always exists.
      const url =
        `${base}/${override.collectionGroup}/fields/${override.fieldPath}` +
        `?updateMask=indexConfig`;
      const res = await post(
        url,
        token,
        { indexConfig: override.indexConfig },
        "PATCH",
      );
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
