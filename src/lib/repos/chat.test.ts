import { beforeEach, describe, expect, it, vi } from "vitest";

type Data = Record<string, unknown>;

const firestore = vi.hoisted(() => {
  const docs = new Map<string, Data>();
  const batches: TestBatch[] = [];
  let failCommit = false;
  let nextMessage = 0;

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
  }

  class TestBatch {
    readonly writes: { kind: "set" | "update"; ref: TestDoc; data: Data }[] = [];
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
    },
  };
});

vi.mock("../firebase/admin", () => ({ adminDb: () => firestore.db }));

const { sendMessage } = await import("./chat");

const CONVERSATION = "conversation-1";
const SENDER = "candidate-1";
const RECIPIENT = "employer-1";

beforeEach(() => {
  firestore.reset();
  firestore.docs.set(`conversations/${CONVERSATION}`, {
    participants: [SENDER, RECIPIENT],
    unread: { [SENDER]: 2, [RECIPIENT]: 3 },
    createdAt: "2026-01-01T00:00:00.000Z",
  });
});

describe("sendMessage", () => {
  it("commits the message and conversation changes as one atomic batch", async () => {
    const result = await sendMessage(CONVERSATION, SENDER, "  Hello there  ");

    expect(result.body).toBe("Hello there");
    expect(firestore.batches).toHaveLength(1);
    expect(firestore.batches[0].commit).toHaveBeenCalledOnce();
    expect(firestore.batches[0].writes).toHaveLength(2);
    expect(firestore.batches[0].writes.map(({ kind, ref }) => [kind, ref.path])).toEqual([
      ["set", `conversations/${CONVERSATION}/messages/${result.id}`],
      ["update", `conversations/${CONVERSATION}`],
    ]);

    const parentUpdate = firestore.batches[0].writes[1].data;
    expect(parentUpdate).toMatchObject({
      lastMessage: "Hello there",
      lastMessageAt: result.createdAt,
    });
    expect(Object.keys(parentUpdate).filter((key) => key.startsWith("unread."))).toEqual([
      `unread.${RECIPIENT}`,
    ]);
  });

  it("does not leave a message when the conversation update cannot commit", async () => {
    firestore.rejectCommit();

    await expect(sendMessage(CONVERSATION, SENDER, "Hello")).rejects.toThrow(
      "parent update rejected",
    );

    expect(firestore.batches[0].commit).toHaveBeenCalledOnce();
    expect(
      [...firestore.docs.keys()].filter((path) => path.includes("/messages/")),
    ).toEqual([]);
  });

  it("rejects a blank body before creating a batch", async () => {
    await expect(sendMessage(CONVERSATION, SENDER, " \n\t ")).rejects.toThrow(
      "Message body is required",
    );
    expect(firestore.batches).toHaveLength(0);
  });
});
