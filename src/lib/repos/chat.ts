import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import type { Conversation, Interview, Message } from "../types";
import {
  decodeCursor,
  encodeCursor,
  PAGE_SIZE,
  type Page,
} from "../pagination";

const conversationsCol = () => adminDb().collection(COLLECTIONS.conversations);
const messagesCol = (conversationId: string) =>
  conversationsCol().doc(conversationId).collection(COLLECTIONS.messages);
const interviewsCol = () => adminDb().collection(COLLECTIONS.interviews);
const userStatsDoc = (uid: string) =>
  adminDb().collection(COLLECTIONS.userStats).doc(uid);

function nonNegativeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const snap = await conversationsCol().doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() as Omit<Conversation, "id">) };
}

export async function listConversationsForUser(
  uid: string,
  cursor: string | null = null,
  pageSize = PAGE_SIZE,
): Promise<Page<Conversation>> {
  const size =
    Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 100)
      : PAGE_SIZE;
  let query = conversationsCol()
    .where("participants", "array-contains", uid)
    .orderBy("activityAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");
  const start = decodeCursor<{ activityAt: string; id: string }>(cursor);
  if (
    start &&
    typeof start.activityAt === "string" &&
    typeof start.id === "string"
  ) {
    query = query.startAfter(start.activityAt, start.id);
  }
  const snap = await query.limit(size + 1).get();
  const docs = snap.docs.slice(0, size);
  const last = docs.at(-1);
  return {
    items: docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Conversation, "id">),
    })),
    nextCursor:
      snap.docs.length > size && last
        ? encodeCursor({
            activityAt: last.data().activityAt as string,
            id: last.id,
          })
        : null,
  };
}

/** Total unread conversation messages, served by one summary-document read. */
export async function countUnreadForUser(uid: string): Promise<number> {
  const snap = await userStatsDoc(uid).get();
  return nonNegativeCount(snap.data()?.unreadConversationMessages);
}

export const MESSAGE_PAGE_SIZE = 50;

/** Newest-first, stable message pagination (the UI reverses each page). */
export async function getMessages(
  conversationId: string,
  cursor: string | null = null,
): Promise<Page<Message>> {
  let query = messagesCol(conversationId)
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");
  const start = decodeCursor<{ createdAt: string; id: string }>(cursor);
  if (
    start &&
    typeof start.createdAt === "string" &&
    typeof start.id === "string"
  ) {
    query = query.startAfter(start.createdAt, start.id);
  }
  const snap = await query.limit(MESSAGE_PAGE_SIZE + 1).get();
  const docs = snap.docs.slice(0, MESSAGE_PAGE_SIZE);
  const last = docs.at(-1);
  return {
    items: docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Message, "id">),
    })),
    nextCursor:
      snap.docs.length > MESSAGE_PAGE_SIZE && last
        ? encodeCursor({
            createdAt: last.data().createdAt as string,
            id: last.id,
          })
        : null,
  };
}

/**
 * Send a message: append it and update the conversation's last-message preview
 * and the recipient's unread counter. The other participant's live onSnapshot
 * listener renders it in realtime.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Message body is required");

  const now = new Date().toISOString();
  const ref = messagesCol(conversationId).doc();
  const message: Omit<Message, "id"> = {
    conversationId,
    senderId,
    body: trimmedBody,
    createdAt: now,
    readAt: null,
  };

  const conversationRef = conversationsCol().doc(conversationId);
  await adminDb().runTransaction(async (transaction) => {
    const convSnap = await transaction.get(conversationRef);
    if (!convSnap.exists) throw new Error("Conversation not found");
    const conv = convSnap.data() as Omit<Conversation, "id">;
    if (!conv.participants.includes(senderId))
      throw new Error("Not a participant");

    const recipient = conv.participants.find(
      (participant) => participant !== senderId,
    );
    const statsRef = recipient ? userStatsDoc(recipient) : null;
    const statsSnap = statsRef ? await transaction.get(statsRef) : null;
    const unread = { ...(conv.unread ?? {}) };

    if (recipient && statsRef) {
      unread[recipient] = nonNegativeCount(unread[recipient]) + 1;
      const total =
        nonNegativeCount(statsSnap?.data()?.unreadConversationMessages) + 1;
      transaction.set(
        statsRef,
        { unreadConversationMessages: total },
        { merge: true },
      );
    }
    transaction.set(ref, message);
    transaction.set(
      conversationRef,
      {
        lastMessage: message.body.slice(0, 140),
        lastMessageAt: now,
        activityAt: now,
        unread,
      },
      { merge: true },
    );
  });

  return { id: ref.id, ...message };
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  const conversationRef = conversationsCol().doc(conversationId);
  const statsRef = userStatsDoc(uid);
  await adminDb().runTransaction(async (transaction) => {
    const [convSnap, statsSnap] = await Promise.all([
      transaction.get(conversationRef),
      transaction.get(statsRef),
    ]);
    if (!convSnap.exists) throw new Error("Conversation not found");
    const conv = convSnap.data() as Omit<Conversation, "id">;
    if (!conv.participants.includes(uid)) throw new Error("Not a participant");

    const priorUnread = nonNegativeCount(conv.unread?.[uid]);
    const total = nonNegativeCount(
      statsSnap.data()?.unreadConversationMessages,
    );
    transaction.set(
      conversationRef,
      { unread: { ...conv.unread, [uid]: 0 } },
      { merge: true },
    );
    transaction.set(
      statsRef,
      { unreadConversationMessages: Math.max(0, total - priorUnread) },
      { merge: true },
    );
  });
}

// ---------------------------------------------------------------------------
// Interviews (scope §15)
// ---------------------------------------------------------------------------

export async function proposeInterview(params: {
  conversationId: string;
  matchId: string;
  jobId: string;
  proposedBy: string;
  date: string;
  time: string;
  location: string;
}): Promise<Interview> {
  const now = new Date().toISOString();
  const ref = interviewsCol().doc();
  const interview: Omit<Interview, "id"> = {
    matchId: params.matchId,
    conversationId: params.conversationId,
    jobId: params.jobId,
    proposedBy: params.proposedBy,
    date: params.date,
    time: params.time,
    location: params.location,
    status: "proposed",
    createdAt: now,
  };
  await ref.set(interview);
  return { id: ref.id, ...interview };
}

export async function respondToInterview(
  interviewId: string,
  status: "accepted" | "declined",
): Promise<void> {
  await interviewsCol().doc(interviewId).set({ status }, { merge: true });
}

export async function listInterviewsForConversation(
  conversationId: string,
): Promise<Interview[]> {
  const snap = await interviewsCol()
    .where("conversationId", "==", conversationId)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Interview, "id">) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
