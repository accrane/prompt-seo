import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import type { RunStatus } from "@/lib/db/types";

const tones: Record<RunStatus, { tone: BadgeTone; label: string }> = {
  queued: { tone: "neutral", label: "Queued" },
  running: { tone: "info", label: "Running" },
  review: { tone: "warning", label: "Needs review" },
  approved: { tone: "success", label: "Approved" },
  failed: { tone: "danger", label: "Failed" },
  canceled: { tone: "neutral", label: "Canceled" },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { tone, label } = tones[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
