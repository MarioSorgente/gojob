import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, test } from "vitest";

const projectId = "demo-gojob-rules";
const conversationId = "conversation-1";
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
});

describe("message creation", () => {
  const messageRef = (id: string) => {
    const db = environment.authenticatedContext("candidate").firestore();
    return doc(db, "conversations", conversationId, "messages", id);
  };

  test("allows a correctly shaped participant message", async () => {
    await assertSucceeds(setDoc(messageRef("valid"), validMessage));
  });

  test("rejects an oversized body", async () => {
    await assertFails(
      setDoc(messageRef("oversized"), { ...validMessage, body: "x".repeat(4001) }),
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

  test("rejects a forged conversation ID", async () => {
    await assertFails(
      setDoc(messageRef("forged-conversation"), {
        ...validMessage,
        conversationId: "conversation-2",
      }),
    );
  });
});
