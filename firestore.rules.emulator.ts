import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, test } from "vitest";

const projectId = "demo-gojob-rules";
const conversationId = "conversation-1";
const seededMessageId = "seeded-message";
let environment: RulesTestEnvironment;

const conversation = {
  participants: ["candidate", "employer"],
  matchId: "match-1",
  jobId: "job-1",
  businessId: "business-1",
  candidateId: "candidate",
  lastMessage: "Hello",
};

const validMessage = {
  conversationId,
  senderId: "candidate",
  body: "Hello there",
  createdAt: "2026-08-13T12:00:00.000Z",
  readAt: null,
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "conversations", conversationId),
      conversation,
    );
    await setDoc(
      doc(
        context.firestore(),
        "conversations",
        conversationId,
        "messages",
        seededMessageId,
      ),
      validMessage,
    );
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe("conversation authorization", () => {
  test("allows participants to read a conversation", async () => {
    const db = environment.authenticatedContext("candidate").firestore();
    await assertSucceeds(getDoc(doc(db, "conversations", conversationId)));
  });

  test("rejects non-participant and unauthenticated reads", async () => {
    const outsider = environment.authenticatedContext("outsider").firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(outsider, "conversations", conversationId)));
    await assertFails(getDoc(doc(anonymous, "conversations", conversationId)));
  });

  test("rejects participant replacement", async () => {
    const db = environment.authenticatedContext("candidate").firestore();
    await assertFails(
      updateDoc(doc(db, "conversations", conversationId), {
        participants: ["candidate", "attacker"],
      }),
    );
  });

  test("rejects participant addition", async () => {
    const db = environment.authenticatedContext("candidate").firestore();
    await assertFails(
      updateDoc(doc(db, "conversations", conversationId), {
        participants: [...conversation.participants, "attacker"],
      }),
    );
  });

  test("rejects conversation metadata changes", async () => {
    const db = environment.authenticatedContext("candidate").firestore();
    for (const change of [
      { matchId: "forged-match" },
      { jobId: "forged-job" },
      { businessId: "forged-business" },
      { candidateId: "attacker" },
      { lastMessage: "forged preview" },
    ]) {
      await assertFails(
        updateDoc(doc(db, "conversations", conversationId), change),
      );
    }
  });

  test("rejects every direct conversation mutation", async () => {
    const db = environment.authenticatedContext("candidate").firestore();
    await assertFails(
      updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: "a legitimate-looking preview",
      }),
    );
    await assertFails(deleteDoc(doc(db, "conversations", conversationId)));
    await assertFails(
      setDoc(doc(db, "conversations", "client-created"), conversation),
    );
  });
});

describe("message creation", () => {
  const messageRef = (id: string) => {
    const db = environment.authenticatedContext("candidate").firestore();
    return doc(db, "conversations", conversationId, "messages", id);
  };

  test("allows a correctly shaped participant message", async () => {
    await assertSucceeds(setDoc(messageRef("valid"), validMessage));
  });

  test("allows a participant to read a message", async () => {
    await assertSucceeds(getDoc(messageRef(seededMessageId)));
  });

  test("rejects non-participant message reads and creates", async () => {
    const db = environment.authenticatedContext("outsider").firestore();
    const ref = (id: string) =>
      doc(db, "conversations", conversationId, "messages", id);
    await assertFails(getDoc(ref(seededMessageId)));
    await assertFails(
      setDoc(ref("outsider-create"), {
        ...validMessage,
        senderId: "outsider",
      }),
    );
  });

  test("rejects sender spoofing", async () => {
    await assertFails(
      setDoc(messageRef("spoofed-sender"), {
        ...validMessage,
        senderId: "employer",
      }),
    );
  });

  test("rejects empty and oversized bodies", async () => {
    await assertFails(
      setDoc(messageRef("empty"), { ...validMessage, body: "" }),
    );
    await assertFails(
      setDoc(messageRef("oversized"), {
        ...validMessage,
        body: "x".repeat(4001),
      }),
    );
  });

  test("rejects invalid timestamp and initial read state values", async () => {
    await assertFails(
      setDoc(messageRef("numeric-created-at"), {
        ...validMessage,
        createdAt: 1,
      }),
    );
    await assertFails(
      setDoc(messageRef("initially-read"), {
        ...validMessage,
        readAt: "2026-08-13T12:00:01.000Z",
      }),
    );
  });

  test("rejects unexpected fields", async () => {
    await assertFails(
      setDoc(messageRef("unexpected"), {
        ...validMessage,
        role: "admin",
      }),
    );
  });

  test("rejects missing required fields", async () => {
    await assertFails(
      setDoc(messageRef("missing-read-at"), {
        conversationId: validMessage.conversationId,
        senderId: validMessage.senderId,
        body: validMessage.body,
        createdAt: validMessage.createdAt,
      }),
    );
  });

  test("rejects a forged conversation ID", async () => {
    await assertFails(
      setDoc(messageRef("forged-conversation"), {
        ...validMessage,
        conversationId: "conversation-2",
      }),
    );
  });

  test("rejects message updates and deletes", async () => {
    await assertFails(
      updateDoc(messageRef(seededMessageId), { body: "edited" }),
    );
    await assertFails(deleteDoc(messageRef(seededMessageId)));
  });
});
