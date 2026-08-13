import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureIndexes } from "./indexes";

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
