/**
 * A minimal in-memory stand-in for the Firestore Admin SDK.
 *
 * The pipeline is the trickiest logic in the codebase and had no coverage above
 * pure functions, because every path goes through `adminDb()`. The Firestore
 * emulator would be the faithful option but needs a JVM, which puts it out of
 * reach of a plain `npm test` on every machine and in CI.
 *
 * So this implements just the surface the repos actually use. It is a test
 * double, not a Firestore implementation: it deliberately does not model
 * transactions, index requirements or concurrency. What it does model
 * faithfully is document identity, merge-vs-replace writes, and collection
 * groups — the semantics the pipeline's correctness depends on.
 */

type Data = Record<string, unknown>;

type WhereOp = "==" | "array-contains" | "in";

interface Filter {
  field: string;
  op: WhereOp;
  value: unknown;
}

let autoId = 0;
const nextId = () => `auto-${++autoId}`;

/** Read a possibly dotted field path, matching Firestore's where() semantics. */
function readPath(data: Data, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      data,
    );
}

function matches(data: Data, filter: Filter): boolean {
  const actual = readPath(data, filter.field);
  switch (filter.op) {
    case "==":
      return actual === filter.value;
    case "array-contains":
      return Array.isArray(actual) && actual.includes(filter.value);
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(actual);
  }
}

/**
 * Deep merge for `set(..., { merge: true })`. Firestore merges nested maps
 * rather than replacing them, which the verification/profileStrength writes
 * rely on — getting this wrong would make the double lie about real bugs.
 */
function mergeInto(target: Data, patch: Data): Data {
  const out: Data = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = mergeInto(existing as Data, value as Data);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export class FakeFirestore {
  /** Full document path -> data, e.g. "jobs/j1/shortlist/c1". */
  readonly docs = new Map<string, Data>();

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this, name);
  }

  collectionGroup(name: string): FakeQuery {
    const paths = [...this.docs.keys()].filter((path) => {
      const segments = path.split("/");
      return segments.length >= 2 && segments[segments.length - 2] === name;
    });
    return new FakeQuery(this, paths);
  }

  batch(): FakeBatch {
    return new FakeBatch(this);
  }

  /** Test helper: every document directly under a collection path. */
  dump(collectionPath: string): { id: string; data: Data }[] {
    return [...this.docs.entries()]
      .filter(([path]) => {
        const segments = path.split("/");
        return segments.slice(0, -1).join("/") === collectionPath;
      })
      .map(([path, data]) => ({ id: path.split("/").pop()!, data }));
  }
}

class FakeCollectionRef {
  constructor(
    private readonly db: FakeFirestore,
    readonly path: string,
  ) {}

  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.db, `${this.path}/${id ?? nextId()}`);
  }

  private query(): FakeQuery {
    const paths = [...this.db.docs.keys()].filter(
      (path) => path.split("/").slice(0, -1).join("/") === this.path,
    );
    return new FakeQuery(this.db, paths);
  }

  where(field: string, op: WhereOp, value: unknown): FakeQuery {
    return this.query().where(field, op, value);
  }
  orderBy(field: string, dir?: "asc" | "desc"): FakeQuery {
    return this.query().orderBy(field, dir);
  }
  limit(n: number): FakeQuery {
    return this.query().limit(n);
  }
  get() {
    return this.query().get();
  }
  count() {
    return this.query().count();
  }
}

class FakeDocRef {
  constructor(
    private readonly db: FakeFirestore,
    readonly path: string,
  ) {}

  get id(): string {
    return this.path.split("/").pop()!;
  }

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }

  async get() {
    const data = this.db.docs.get(this.path);
    return {
      id: this.id,
      exists: data !== undefined,
      ref: this,
      data: () => (data === undefined ? undefined : structuredClone(data)),
    };
  }

  async set(data: Data, options?: { merge?: boolean }) {
    const existing = this.db.docs.get(this.path);
    const next =
      options?.merge && existing
        ? mergeInto(existing, data)
        : structuredClone(data);
    this.db.docs.set(this.path, next);
  }

  async delete() {
    this.db.docs.delete(this.path);
  }
}

class FakeQuery {
  private filters: Filter[] = [];
  private order: { field: string; dir: "asc" | "desc" } | null = null;
  private max: number | null = null;

  constructor(
    private readonly db: FakeFirestore,
    private readonly paths: string[],
  ) {}

  where(field: string, op: WhereOp, value: unknown): FakeQuery {
    this.filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): FakeQuery {
    // Only the primary sort is modelled; the repos use later orderBy clauses
    // purely as cursor tie-breakers.
    this.order ??= { field, dir };
    return this;
  }

  limit(n: number): FakeQuery {
    this.max = n;
    return this;
  }

  /**
   * Accepted and ignored. Cursor paging is covered directly in
   * pagination.test.ts against a deterministic source; modelling it here would
   * mean reimplementing Firestore's ordering semantics in the double, which is
   * exactly the kind of fiction that makes a fake stop being trustworthy.
   */
  startAfter(): FakeQuery {
    return this;
  }

  private resolve(): { path: string; data: Data }[] {
    let rows = this.paths
      .map((path) => ({ path, data: this.db.docs.get(path)! }))
      .filter((row) => row.data !== undefined)
      .filter((row) => this.filters.every((f) => matches(row.data, f)));

    if (this.order) {
      const { field, dir } = this.order;
      rows = [...rows].sort((a, b) => {
        const av = readPath(a.data, field);
        const bv = readPath(b.data, field);
        if (av === bv) return 0;
        const less = (av as never) < (bv as never) ? -1 : 1;
        return dir === "asc" ? less : -less;
      });
    }

    return this.max === null ? rows : rows.slice(0, this.max);
  }

  async get() {
    const rows = this.resolve();
    return {
      size: rows.length,
      empty: rows.length === 0,
      docs: rows.map((row) => ({
        id: row.path.split("/").pop()!,
        exists: true,
        ref: new FakeDocRef(this.db, row.path),
        data: () => structuredClone(row.data),
      })),
    };
  }

  count() {
    const rows = this.resolve();
    return { get: async () => ({ data: () => ({ count: rows.length }) }) };
  }
}

class FakeBatch {
  private ops: (() => Promise<void>)[] = [];

  constructor(private readonly db: FakeFirestore) {}

  set(ref: FakeDocRef, data: Data, options?: { merge?: boolean }) {
    this.ops.push(() => ref.set(data, options));
    return this;
  }

  delete(ref: FakeDocRef) {
    this.ops.push(() => ref.delete());
    return this;
  }

  async commit() {
    // Firestore rejects a batch over 500 operations; mirroring that is the
    // whole point of the chunking this suite guards.
    if (this.ops.length > 500) {
      throw new Error("Batch size exceeds 500 operations");
    }
    for (const op of this.ops) await op();
    this.ops = [];
  }
}

/** Fresh database plus a reset of the auto-id counter, for beforeEach. */
export function createFakeFirestore(): FakeFirestore {
  autoId = 0;
  return new FakeFirestore();
}
