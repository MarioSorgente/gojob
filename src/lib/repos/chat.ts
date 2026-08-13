import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import type { Conversation, Interview, Message } from "../types";

const conversationsCol = () => adminDb().collection(COLLECTIONS.conversations);
const messagesCol = (conversationId: string) =>
  conversationsCol().doc(conversationId).collection(COLLECTIONS.messages);
const interviewsCol = () => adminDb().collection(COLLECTIONS.interviews);

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const snap = await conversationsCol().doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() as Omit<Conversation, "id">) };
}

export async function listConversationsForUser(
  uid: string,
): Promise<Conversation[]> {
  const snap = await conversationsCol()
    .where("participants", "array-contains", uid)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }))
    .sort((a, b) =>
      (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
    );
}

/**
 * Total unread messages across a user's conversations, for the nav badge.
 *
 * Unread counts live in a map keyed by uid (`unread.{uid}`), so Firestore can't
 * sum them — an aggregation query can count documents but not add up a field,
 * and a per-user field path can't be indexed. The read is unavoidable; what this
 * avoids is the object construction and sort that listConversationsForUser does
 * on every single page render just to produce one number.
 */
export async function countUnreadForUser(uid: string): Promise<number> {
  const snap = await conversationsCol()
    .where("participants", "array-contains", uid)
    .select(`unread.${uid}`)
    .get();

  return snap.docs.reduce((total, doc) => {
    const value = (doc.data() as { unread?: Record<string, number> }).unread?.[uid];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const snap = await messagesCol(conversationId).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }));
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
  const conv = await getConversation(conversationId);
  if (!conv) throw new Error("Conversation not found");
  if (!conv.participants.includes(senderId)) {
    throw new Error("Not a participant");
  }

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

  const recipient = conv.participants.find((p) => p !== senderId);
  const update: Record<string, unknown> = {
    lastMessage: message.body.slice(0, 140),
    lastMessageAt: now,
  };
  if (recipient) update[`unread.${recipient}`] = FieldValue.increment(1);

  const batch = adminDb().batch();
  batch.set(ref, message);
  batch.update(conversationsCol().doc(conversationId), update);
  await batch.commit();

  return { id: ref.id, ...message };
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  await conversationsCol()
    .doc(conversationId)
    .set({ unread: { [uid]: 0 } }, { merge: true });
}

// ---------------------------------------------------------------------------
// Interviews (scope §15)
// ---------------------------------------------------------------------------

export async function proposeInterview(
  params: {
    conversationId: string;
    matchId: string;
    jobId: string;
    proposedBy: string;
    date: string;
    time: string;
    location: string;
  },
): Promise<Interview> {
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
