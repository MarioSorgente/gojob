"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteFromSearchAction } from "@/app/employer/actions";
import { Button, Select, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { MatchCelebration } from "@/components/MatchCelebration";
import { useToast } from "@/components/Toast";

/**
 * Invite a candidate found through search. Invitations are always tied to a
 * job, so when the employer has more than one live job we ask which.
 */
export function InviteToJobButton({
  candidateId,
  name,
  jobs,
  size = "sm",
}: {
  candidateId: string;
  name: string;
  jobs: { id: string; role: string }[];
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const t = useT();
  const { show } = useToast();
  const [picking, setPicking] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [matchHref, setMatchHref] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  function invite(targetJobId: string) {
    start(async () => {
      const res = await inviteFromSearchAction(targetJobId, candidateId);
      setPicking(false);
      setInvited(true);
      if (res.matched && res.conversationId) {
        setMatchHref(`/employer/chat/${res.conversationId}`);
      } else {
        show(`${t("employer.invited")} — ${name}`);
        router.refresh();
      }
    });
  }

  if (jobs.length === 0) {
    return (
      <Button size={size} variant="subtle" disabled title={t("employer.noJobsHint")}>
        {t("employer.invite")}
      </Button>
    );
  }

  if (invited && !matchHref) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
        <Icon name="check" className="h-4 w-4" />
        {t("employer.invited")}
      </span>
    );
  }

  return (
    <>
      {picking && jobs.length > 1 ? (
        <div className="flex items-center gap-2">
          <Select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="h-9 py-0 text-xs"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.role}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={() => invite(jobId)} disabled={pending}>
            {pending ? <Spinner /> : null}
            {t("chat.send")}
          </Button>
        </div>
      ) : (
        <Button
          size={size}
          disabled={pending}
          onClick={() => (jobs.length === 1 ? invite(jobs[0].id) : setPicking(true))}
        >
          {pending ? <Spinner /> : null}
          {t("employer.invite")}
        </Button>
      )}

      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={name}
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </>
  );
}
