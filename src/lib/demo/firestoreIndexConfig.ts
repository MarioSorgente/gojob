import firestoreIndexConfig from "../../../firestore.indexes.json";

export type QueryScope = "COLLECTION" | "COLLECTION_GROUP";
export type IndexOrder = "ASCENDING" | "DESCENDING";
export type ArrayConfig = "CONTAINS";

export interface AdminIndexField {
  fieldPath: string;
  order?: IndexOrder;
  arrayConfig?: ArrayConfig;
}

export interface AdminCompositeIndex {
  collectionGroup: string;
  queryScope: QueryScope;
  fields: AdminIndexField[];
}

export interface AdminFieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexConfig: {
    indexes: Array<{
      queryScope: QueryScope;
      fields: AdminIndexField[];
    }>;
  };
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, description: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${description} in firestore.indexes.json`);
  }
  return value as JsonRecord;
}

function string(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${description} in firestore.indexes.json`);
  }
  return value;
}

function queryScope(value: unknown): QueryScope {
  if (value !== "COLLECTION" && value !== "COLLECTION_GROUP") {
    throw new Error(
      `Invalid queryScope in firestore.indexes.json: ${String(value)}`,
    );
  }
  return value;
}

function indexDirection(
  source: JsonRecord,
): Pick<AdminIndexField, "order" | "arrayConfig"> {
  if (source.order !== undefined && source.arrayConfig !== undefined) {
    throw new Error("An index field cannot have both order and arrayConfig");
  }
  if (source.order !== undefined) {
    if (source.order !== "ASCENDING" && source.order !== "DESCENDING") {
      throw new Error(
        `Invalid order in firestore.indexes.json: ${String(source.order)}`,
      );
    }
    return { order: source.order };
  }
  if (source.arrayConfig === "CONTAINS")
    return { arrayConfig: source.arrayConfig };
  throw new Error(
    `Invalid arrayConfig in firestore.indexes.json: ${String(source.arrayConfig)}`,
  );
}

function compositeIndex(value: unknown): AdminCompositeIndex {
  const source = record(value, "composite index");
  if (!Array.isArray(source.fields))
    throw new Error("Composite index fields must be an array");
  return {
    collectionGroup: string(source.collectionGroup, "collectionGroup"),
    queryScope: queryScope(source.queryScope),
    fields: source.fields.map((value) => {
      const field = record(value, "composite index field");
      return {
        fieldPath: string(field.fieldPath, "fieldPath"),
        ...indexDirection(field),
      };
    }),
  };
}

function fieldOverride(value: unknown): AdminFieldOverride {
  const source = record(value, "field override");
  const fieldPath = string(source.fieldPath, "fieldPath");
  if (!Array.isArray(source.indexes))
    throw new Error("Field override indexes must be an array");
  return {
    collectionGroup: string(source.collectionGroup, "collectionGroup"),
    fieldPath,
    indexConfig: {
      indexes: source.indexes.map((value) => {
        const index = record(value, "field override index");
        return {
          queryScope: queryScope(index.queryScope),
          fields: [{ fieldPath, ...indexDirection(index) }],
        };
      }),
    },
  };
}

/** Convert the Firebase CLI index format into Firestore Admin API request bodies. */
export function adminIndexRequests(config: unknown = firestoreIndexConfig): {
  compositeIndexes: AdminCompositeIndex[];
  fieldOverrides: AdminFieldOverride[];
} {
  const source = record(config, "index configuration");
  if (!Array.isArray(source.indexes) || !Array.isArray(source.fieldOverrides)) {
    throw new Error(
      "firestore.indexes.json must contain indexes and fieldOverrides arrays",
    );
  }
  return {
    compositeIndexes: source.indexes.map(compositeIndex),
    fieldOverrides: source.fieldOverrides.map(fieldOverride),
  };
}
