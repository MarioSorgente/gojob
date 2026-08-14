"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  proposeInterviewAction,
  respondInterviewAction,
} from "@/app/_actions/chat";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/format";
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
  const { locale, t } = useI18n();
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
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon name="calendar" className="h-4 w-4 text-muted" />
            {t("chat.interviews")}
          </p>
          <p className="text-sm text-muted">
            {formatDate(iv.date, locale)} · {iv.time} · {iv.location}
          </p>
          {iv.status === "proposed" && iv.proposedBy !== uid && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(iv.id, "declined")}
                disabled={pending}
              >
                {t("chat.decline")}
              </Button>
              <Button size="sm" onClick={() => respond(iv.id, "accepted")} disabled={pending}>
                {t("chat.accept")}
              </Button>
            </div>
          )}
          {iv.status === "proposed" && iv.proposedBy === uid && (
            <p className="mt-1 text-xs text-muted">{t("chat.interviewProposed")}</p>
          )}
          {iv.status === "accepted" && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
              <Icon name="check" className="h-3.5 w-3.5" />
              {t("chat.interviewAccepted")}
            </p>
          )}
          {iv.status === "declined" && (
            <p className="mt-1 text-xs text-danger">{t("chat.interviewDeclined")}</p>
          )}
        </Card>
      ))}

      {open ? (
        <Card className="p-3">
          <form onSubmit={propose} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label={t("chat.interviewDate")}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                type="time"
                aria-label={t("chat.interviewTime")}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <Input
              aria-label={t("chat.interviewLocation")}
              placeholder={t("chat.interviewLocation")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button type="button" variant="subtle" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {t("chat.proposeInterview")}
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
          <Icon name="calendar" className="h-4 w-4" />
          {t("chat.proposeInterview")}
        </Button>
      )}
    </div>
  );
}
