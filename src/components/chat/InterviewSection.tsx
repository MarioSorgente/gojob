"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  proposeInterviewAction,
  respondInterviewAction,
} from "@/app/_actions/chat";
import { Button, Card, Input } from "@/components/ui";
import type { Interview } from "@/lib/types";

export function InterviewSection({
  conversationId,
  uid,
  interviews,
}: {
  conversationId: string;
  uid: string;
  interviews: Interview[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [pending, start] = useTransition();

  function propose(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await proposeInterviewAction(conversationId, date, time, location);
      setOpen(false);
      setDate("");
      setTime("");
      setLocation("");
      router.refresh();
    });
  }

  function respond(id: string, status: "accepted" | "declined") {
    start(async () => {
      await respondInterviewAction(id, conversationId, status);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {interviews.map((iv) => (
        <Card key={iv.id} className="p-3">
          <p className="text-sm font-semibold">📅 Interview</p>
          <p className="text-sm text-muted">
            {iv.date} at {iv.time} · {iv.location}
          </p>
          {iv.status === "proposed" && iv.proposedBy !== uid && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(iv.id, "declined")}
                disabled={pending}
              >
                Decline
              </Button>
              <Button size="sm" onClick={() => respond(iv.id, "accepted")} disabled={pending}>
                Accept
              </Button>
            </div>
          )}
          {iv.status === "proposed" && iv.proposedBy === uid && (
            <p className="mt-1 text-xs text-muted">Waiting for a response…</p>
          )}
          {iv.status === "accepted" && (
            <p className="mt-1 text-xs font-semibold text-success">✓ Confirmed</p>
          )}
          {iv.status === "declined" && (
            <p className="mt-1 text-xs text-red-500">Declined</p>
          )}
        </Card>
      ))}

      {open ? (
        <Card className="p-3">
          <form onSubmit={propose} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <Input
              placeholder="Location (café address or video call)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button type="button" variant="subtle" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "…" : "Propose"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          📅 Schedule interview
        </Button>
      )}
    </div>
  );
}
