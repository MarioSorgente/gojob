"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  getConversation,
  markConversationRead,
  proposeInterview,
  respondToInterview,
  sendMessage,
} from "@/lib/repos/chat";
import type { Conversation } from "@/lib/types";

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

export async function sendMessageAction(conversationId: string, body: string) {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  if (body.trim()) await sendMessage(conversationId, user.uid, body);
}

export async function markReadAction(conversationId: string) {
  const user = await requireUser();
  await assertParticipant(conversationId, user.uid);
  await markConversationRead(conversationId, user.uid);
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
