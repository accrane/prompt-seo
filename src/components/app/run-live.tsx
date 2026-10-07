"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { renderMarkdown } from "@/lib/markdown";

type LiveStep = { id: string; idx: number; section: string; status: string; output_md: string };
type LiveState = {
  status: string;
  error: string | null;
  cost_usd: number;
  lease_until: string | null;
  steps: LiveStep[];
};

const POLL_MS = 2500;

/**
 * Polls the run while the worker writes it and shows each section as it
 * streams in. Refreshes the server page once the run leaves "running" so
 * the review tools appear.
 */
export function RunLive({ runId, initial }: { runId: string; initial: LiveState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as LiveState;
        if (stopped) return;
        setState(next);
        if (next.status !== "running" && next.status !== "queued") {
          router.refresh();
        }
      } catch {
        // Transient network error: the next tick retries.
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [runId, router]);

  const current = state.steps.find((s) => s.status === "running");
  const done = state.steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-700">
            <span className="font-medium text-slate-950">
              {done} of {state.steps.length} sections done
            </span>
            {current ? (
              <> · writing “{current.section}”</>
            ) : state.status === "queued" ? (
              " · starting"
            ) : null}
          </div>
          <span className="text-sm tabular-nums text-slate-500">
            ${state.cost_usd.toFixed(2)} so far
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all"
            style={{ width: `${Math.max(3, (done / Math.max(1, state.steps.length)) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Claude may pause to search before text appears. You can leave; the run keeps going.
        </p>
      </section>

      {state.steps
        .filter((s) => s.status === "done" || s.status === "running")
        .map((s) => (
          <LiveSection key={s.id} step={s} />
        ))}
    </div>
  );
}

function LiveSection({ step }: { step: LiveStep }) {
  const html = useMemo(() => renderMarkdown(step.output_md), [step.output_md]);
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-2.5">
        <span className="type-label text-slate-500">Section {step.idx + 1}</span>
        {step.status === "running" ? (
          <StatusBadge tone="info">Writing</StatusBadge>
        ) : (
          <StatusBadge tone="success">Done</StatusBadge>
        )}
      </header>
      <div className="px-5 py-4">
        {step.output_md ? (
          <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-slate-500">Researching and thinking…</p>
        )}
      </div>
    </section>
  );
}
