import { beforeEach, describe, expect, it, vi } from "vitest";

type Data = Record<string, unknown>;

const firestore = vi.hoisted(() => {
  const docs = new Map<string, Data>();
  const batches: TestBatch[] = [];
  let failCommit = false;
  let nextMessage = 0;
  let transactionTail = Promise.resolve();

  const merge = (base: Data, patch: Data): Data => {
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      result[key] =
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key])
          ? merge(result[key] as Data, value as Data)
          : value;
    }
    return result;
  };

  class TestDoc {
    constructor(readonly path: string) {}

    get id() {
      return this.path.split("/").at(-1)!;
    }

    collection(name: string) {
      return new TestCollection(`${this.path}/${name}`);
    }

    async get() {
      const data = docs.get(this.path);
      return {
        exists: data !== undefined,
        data: () => data,
      };
    }
  }

  class TestCollection {
    constructor(readonly path: string) {}

    doc(id?: string) {
      return new TestDoc(`${this.path}/${id ?? `message-${++nextMessage}`}`);
    }

    where(field: string, _op: string, value: unknown) {
      return new TestQuery(this.path).where(field, _op, value);
    }
  }

  class TestQuery {
    private participant?: string;
    private orders: { field: string; direction: "asc" | "desc" }[] = [];
    private after?: unknown[];
    private maximum = Infinity;

    constructor(readonly path: string) {}

    where(_field: string, _op: string, value: unknown) {
      this.participant = value as string;
      return this;
    }

    orderBy(field: unknown, direction: "asc" | "desc") {
      this.orders.push({
        field: typeof field === "string" ? field : "__name__",
        direction,
      });
      return this;
    }

    startAfter(...values: unknown[]) {
      this.after = values;
      return this;
    }

    limit(value: number) {
      this.maximum = value;
      return this;
    }

    async get() {
      const prefix = `${this.path}/`;
      let found = [...docs.entries()]
        .filter(
          ([path]) =>
            path.startsWith(prefix) && !path.slice(prefix.length).includes("/"),
        )
        .map(([path, data]) => ({
          id: path.slice(prefix.length),
          data: () => data,
        }));
      if (this.participant) {
        found = found.filter((doc) =>
          (doc.data().participants as string[] | undefined)?.includes(
            this.participant!,
          ),
        );
      }
      const values = (doc: { id: string; data: () => Data }) =>
        this.orders.map(({ field }) =>
          field === "__name__" ? doc.id : doc.data()[field],
        );
      found.sort((a, b) => {
        const av = values(a);
        const bv = values(b);
        for (let i = 0; i < av.length; i++) {
          const comparison = String(av[i]).localeCompare(String(bv[i]));
          if (comparison)
            return this.orders[i].direction === "desc"
              ? -comparison
              : comparison;
        }
        return 0;
      });
      if (this.after) {
        found = found.filter((doc) => {
          const current = values(doc);
          for (let i = 0; i < current.length; i++) {
            const comparison = String(current[i]).localeCompare(
              String(this.after![i]),
            );
            if (comparison)
              return this.orders[i].direction === "desc"
                ? comparison < 0
                : comparison > 0;
          }
          return false;
        });
      }
      return { docs: found.slice(0, this.maximum) };
    }
  }

  class TestBatch {
    readonly writes: { kind: "set" | "update"; ref: TestDoc; data: Data }[] =
      [];
    commit = vi.fn(async () => {
      if (failCommit) throw new Error("parent update rejected");
      for (const write of this.writes) {
        docs.set(write.ref.path, {
          ...(write.kind === "update" ? docs.get(write.ref.path) : {}),
          ...write.data,
        });
      }
    });

    set(ref: TestDoc, data: Data) {
      this.writes.push({ kind: "set", ref, data });
      return this;
    }

    update(ref: TestDoc, data: Data) {
      this.writes.push({ kind: "update", ref, data });
      return this;
    }
  }

  class TestTransaction {
    readonly writes: { ref: TestDoc; data: Data; merge: boolean }[] = [];

    get(ref: TestDoc) {
      return ref.get();
    }

    set(ref: TestDoc, data: Data, options?: { merge?: boolean }) {
      this.writes.push({ ref, data, merge: options?.merge === true });
      return this;
    }

    commit() {
      if (failCommit) throw new Error("parent update rejected");
      for (const write of this.writes) {
        docs.set(
          write.ref.path,
          write.merge
            ? merge(docs.get(write.ref.path) ?? {}, write.data)
            : write.data,
        );
      }
    }
  }

  return {
    docs,
    batches,
    reset() {
      docs.clear();
      batches.length = 0;
      failCommit = false;
      nextMessage = 0;
    },
    rejectCommit() {
      failCommit = true;
    },
    db: {
      collection: (name: string) => new TestCollection(name),
      batch: () => {
        const batch = new TestBatch();
        batches.push(batch);
        return batch;
      },
      runTransaction: async <T>(
        callback: (tx: TestTransaction) => Promise<T>,
      ) => {
        const previous = transactionTail;
        let release!: () => void;
        transactionTail = new Promise<void>((resolve) => (release = resolve));
        await previous;
        try {
          const tx = new TestTransaction();
          const result = await callback(tx);
          tx.commit();
          return result;
        } finally {
          release();
        }
      },
    },
  };
});

vi.mock("../firebase/admin", () => ({ adminDb: () => firestore.db }));

const {
  countUnreadForUser,
  listConversationsForUser,
  markConversationRead,
  sendMessage,
} = await import("./chat");

const CONVERSATION = "conversation-1";
const SENDER = "candidate-1";
const RECIPIENT = "employer-1";

beforeEach(() => {
  firestore.reset();
  firestore.docs.set(`conversations/${CONVERSATION}`, {
    participants: [SENDER, RECIPIENT],
    unread: { [SENDER]: 2, [RECIPIENT]: 3 },
    createdAt: "2026-01-01T00:00:00.000Z",
    activityAt: "2026-01-01T00:00:00.000Z",
  });
  firestore.docs.set(`userStats/${SENDER}`, { unreadConversationMessages: 2 });
  firestore.docs.set(`userStats/${RECIPIENT}`, {
    unreadConversationMessages: 3,
  });
});

describe("sendMessage", () => {
  it("atomically writes the message and both unread counters", async () => {
    const result = await sendMessage(CONVERSATION, SENDER, "  Hello there  ");

    expect(result.body).toBe("Hello there");
    const parentUpdate = firestore.docs.get(`conversations/${CONVERSATION}`)!;
    expect(parentUpdate).toMatchObject({
      lastMessage: "Hello there",
      lastMessageAt: result.createdAt,
      activityAt: result.createdAt,
    });
    expect((parentUpdate.unread as Data)[RECIPIENT]).toBe(4);
    expect(await countUnreadForUser(RECIPIENT)).toBe(4);
  });

  it("does not leave a message when the conversation update cannot commit", async () => {
    firestore.rejectCommit();

    await expect(sendMessage(CONVERSATION, SENDER, "Hello")).rejects.toThrow(
      "parent update rejected",
    );

    expect(
      [...firestore.docs.keys()].filter((path) => path.includes("/messages/")),
    ).toEqual([]);
  });

  it("does not lose increments from concurrent sends", async () => {
    await Promise.all([
      sendMessage(CONVERSATION, SENDER, "One"),
      sendMessage(CONVERSATION, SENDER, "Two"),
      sendMessage(CONVERSATION, SENDER, "Three"),
    ]);
    expect(await countUnreadForUser(RECIPIENT)).toBe(6);
    const conversation = firestore.docs.get(`conversations/${CONVERSATION}`)!;
    expect((conversation.unread as Data)[RECIPIENT]).toBe(6);
  });

  it("rejects a blank body before creating a batch", async () => {
    await expect(sendMessage(CONVERSATION, SENDER, " \n\t ")).rejects.toThrow(
      "Message body is required",
    );
    expect(firestore.batches).toHaveLength(0);
  });
});

describe("markConversationRead", () => {
  it("subtracts the prior conversation count only once", async () => {
    await markConversationRead(CONVERSATION, RECIPIENT);
    await markConversationRead(CONVERSATION, RECIPIENT);
    expect(await countUnreadForUser(RECIPIENT)).toBe(0);
  });

  it("never produces a negative summary, including concurrent reads", async () => {
    firestore.docs.set(`userStats/${RECIPIENT}`, {
      unreadConversationMessages: 1,
    });
    await Promise.all([
      markConversationRead(CONVERSATION, RECIPIENT),
      markConversationRead(CONVERSATION, RECIPIENT),
    ]);
    expect(await countUnreadForUser(RECIPIENT)).toBe(0);
  });
});

describe("listConversationsForUser", () => {
  function conversation(id: string, activityAt: string) {
    firestore.docs.set(`conversations/${id}`, {
      participants: [SENDER, RECIPIENT],
      createdAt: activityAt,
      activityAt,
      lastMessage: null,
      lastMessageAt: null,
    });
  }

  it("includes a new conversation with no messages", async () => {
    const page = await listConversationsForUser(SENDER);
    expect(page.items.map(({ id }) => id)).toEqual([CONVERSATION]);
  });

  it("moves a conversation to the front after a message", async () => {
    conversation("newer-before-message", "2026-02-01T00:00:00.000Z");
    await sendMessage(CONVERSATION, SENDER, "Most recent");
    const page = await listConversationsForUser(SENDER);
    expect(page.items[0].id).toBe(CONVERSATION);
  });

  it("uses descending document ID as a stable equal-time tie-breaker", async () => {
    conversation("conversation-a", "2026-02-01T00:00:00.000Z");
    conversation("conversation-z", "2026-02-01T00:00:00.000Z");
    const page = await listConversationsForUser(SENDER);
    expect(page.items.slice(0, 2).map(({ id }) => id)).toEqual([
      "conversation-z",
      "conversation-a",
    ]);
  });

  it("returns a cursor without duplicates across pages", async () => {
    for (let i = 0; i < 5; i++)
      conversation(`page-${i}`, `2026-03-0${i + 1}T00:00:00.000Z`);
    const first = await listConversationsForUser(SENDER, null, 2);
    const second = await listConversationsForUser(SENDER, first.nextCursor, 2);
    expect(first.nextCursor).not.toBeNull();
    expect(second.items.map(({ id }) => id)).toEqual(["page-2", "page-1"]);
    expect(
      second.items.some(({ id }) => first.items.some((item) => item.id === id)),
    ).toBe(false);
  });
});
