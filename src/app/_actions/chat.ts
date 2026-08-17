"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  getConversation,
  getMessages,
  markConversationRead,
  proposeInterview,
  respondToInterview,
  sendMessage,
} from "@/lib/repos/chat";
import type { Conversation, Message } from "@/lib/types";

async function assertParticipant(
  conversationId: string,
  uid: string,
): Promise<Conversation> {
  const conv = await getConversation(conversationId);
  if (!conv || !conv.participants.includes(uid)) {
    throw new Error("Not allowed");
  }
  return conv;
}

export interface SendMessageResult {
  /** Set when the message was refused — shown to the sender verbatim. */
  error?: string;
  /** Lets the sender render immediately even when realtime auth is still restoring. */
  message?: Message;
}

export async function sendMessageAction(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  if (!body.trim()) return {};

  const limited = await checkRateLimit(user.uid, "message");
  if (limited) return { error: limited };

  const message = await sendMessage(conversationId, user.uid, body);
  return { message };
}

export async function markReadAction(conversationId: string) {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  await markConversationRead(conversationId, user.uid);
}

export async function loadOlderMessagesAction(
  conversationId: string,
  cursor: string,
) {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  return getMessages(conversationId, cursor);
}

export async function proposeInterviewAction(
  conversationId: string,
  date: string,
  time: string,
  location: string,
) {
  const user = await requireUser();
  const conv = await assertParticipant(conversationId, user.uid);
  await proposeInterview({
    conversationId,
    matchId: conv.matchId,
    jobId: conv.jobId,
    proposedBy: user.uid,
    date,
    time,
    location,
  });
  revalidatePath(`/candidate/chat/${conversationId}`);
  revalidatePath(`/employer/chat/${conversationId}`);
}

export async function respondInterviewAction(
  interviewId: string,
  conversationId: string,
  status: "accepted" | "declined",
) {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  await respondToInterview(interviewId, status);
  revalidatePath(`/candidate/chat/${conversationId}`);
  revalidatePath(`/employer/chat/${conversationId}`);
}
