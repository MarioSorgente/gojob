import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureIndexes, indexHealth } from "./indexes";

const app = {
  options: {
    credential: {
      getAccessToken: vi.fn().mockResolvedValue({ access_token: "token" }),
    },
  },
};

const healthConfig = {
  indexes: [
    {
      collectionGroup: "jobs",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "status", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" },
      ],
    },
  ],
  fieldOverrides: [],
};

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: vi
      .fn()
      .mockResolvedValue(
        typeof body === "string" ? body : JSON.stringify(body),
      ),
  };
}

describe("ensureIndexes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends every index and field override from the canonical JSON", async () => {
    const canonical = JSON.parse(
      readFileSync(resolve(process.cwd(), "firestore.indexes.json"), "utf8"),
    ) as {
      indexes: Array<{
        collectionGroup: string;
        queryScope: string;
        fields: unknown[];
      }>;
      fieldOverrides: Array<{
        collectionGroup: string;
        fieldPath: string;
        indexes: Array<Record<string, string>>;
      }>;
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(""),
    });
    vi.stubGlobal("fetch", fetchMock);
    const app = {
      options: {
        credential: {
          getAccessToken: vi.fn().mockResolvedValue({ access_token: "token" }),
        },
      },
    };

    await ensureIndexes(app as never, "test-project");

    const requests = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: init.method,
      body: JSON.parse(String(init.body)),
    }));
    const base =
      "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/collectionGroups";
    for (const index of canonical.indexes) {
      expect(requests).toContainEqual({
        url: `${base}/${index.collectionGroup}/indexes`,
        method: "POST",
        body: { queryScope: index.queryScope, fields: index.fields },
      });
    }
    for (const override of canonical.fieldOverrides) {
      expect(requests).toContainEqual({
        url: `${base}/${override.collectionGroup}/fields/${override.fieldPath}?updateMask=indexConfig`,
        method: "PATCH",
        body: {
          indexConfig: {
            indexes: override.indexes.map(
              ({ queryScope, order, arrayConfig }) => ({
                queryScope,
                fields: [
                  {
                    fieldPath: override.fieldPath,
                    ...(order === undefined ? {} : { order }),
                    ...(arrayConfig === undefined ? {} : { arrayConfig }),
                  },
                ],
              }),
            ),
          },
        },
      });
    }
    expect(requests).toHaveLength(
      canonical.indexes.length + canonical.fieldOverrides.length,
    );
  });
});

describe("indexHealth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["READY", "READY", "HEALTHY"],
    ["CREATING", "BUILDING", "DEGRADED"],
  ])(
    "reports Admin API state %s as %s",
    async (adminState, expected, databaseState) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          response({
            indexes: [
              {
                ...healthConfig.indexes[0],
                fields: [
                  ...healthConfig.indexes[0].fields,
                  { fieldPath: "__name__", order: "DESCENDING" },
                ],
                state: adminState,
              },
            ],
          }),
        ),
      );
      const result = await indexHealth(app as never, "project", healthConfig);
      expect(result.databaseState).toBe(databaseState);
      expect(result.indexes[0]).toMatchObject({
        status: expected,
        collectionGroup: "jobs",
      });
    },
  );

  it("reports a required definition missing from a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ indexes: [] })),
    );
    const result = await indexHealth(app as never, "project", healthConfig);
    expect(result).toMatchObject({
      databaseState: "DEGRADED",
      indexes: [{ status: "MISSING" }],
    });
  });

  it("reports malformed Admin API definitions as errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ indexes: [{ state: "READY" }] })),
    );
    const result = await indexHealth(app as never, "project", healthConfig);
    expect(result.databaseState).toBe("UNHEALTHY");
    expect(result.indexes[0]).toMatchObject({ status: "ERROR" });
    expect(result.indexes[0].detail).toContain("malformed index definition");
  });

  it("reports Admin API failures without treating indexes as missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response("permission denied", false, 403)),
    );
    const result = await indexHealth(app as never, "project", healthConfig);
    expect(result.databaseState).toBe("UNHEALTHY");
    expect(result.indexes[0]).toMatchObject({ status: "ERROR" });
    expect(result.indexes[0].detail).toContain("403");
  });

  it("compares relevant field configurations and their build states", async () => {
    const config = {
      indexes: [],
      fieldOverrides: [
        {
          collectionGroup: "shortlist",
          fieldPath: "candidateId",
          indexes: [{ order: "ASCENDING", queryScope: "COLLECTION_GROUP" }],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          indexConfig: {
            indexes: [
              {
                queryScope: "COLLECTION_GROUP",
                fields: [{ fieldPath: "candidateId", order: "ASCENDING" }],
                state: "CREATING",
              },
            ],
          },
        }),
      ),
    );
    const result = await indexHealth(app as never, "project", config);
    expect(result.indexes[0]).toMatchObject({
      kind: "field",
      status: "BUILDING",
      collectionGroup: "shortlist",
    });
  });
});
