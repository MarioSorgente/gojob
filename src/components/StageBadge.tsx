import type { PipelineStage } from "@/lib/types";
import { Badge } from "./ui";

const MAP: Record<PipelineStage, { label: string; tone: "brand" | "green" | "amber" | "slate" | "red" }> = {
  recommended: { label: "Recommended", tone: "slate" },
  applied: { label: "Applied", tone: "brand" },
  matched: { label: "Matched", tone: "green" },
  interview: { label: "Interview", tone: "amber" },
  hired: { label: "Hired", tone: "green" },
  rejected: { label: "Not selected", tone: "slate" },
};

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const { label, tone } = MAP[stage];
  return <Badge tone={tone}>{label}</Badge>;
}
