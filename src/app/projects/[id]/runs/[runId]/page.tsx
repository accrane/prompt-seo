import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { CopyButton } from "@/components/app/copy-button";
import { Flash } from "@/components/app/flash";
import { Markdown } from "@/components/app/markdown";
import { ProjectNav } from "@/components/app/project-nav";
import { RunLive } from "@/components/app/run-live";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { SubmitButton } from "@/components/app/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { checkboxClasses, textareaClasses } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  approveRun,
  cancelRun,
  resumeRun,
  revertSectionEdit,
  saveSectionEdit,
} from "@/lib/actions/runs";
import { requireOperator } from "@/lib/auth";
import type { Run } from "@/lib/db/types";
import { formatDate, formatDateTime, formatTokens, formatUsd } from "@/lib/format";
import { getPage, getProject, getRun, listSteps, runMarkdown, stepText } from "@/lib/projects";
import { PROMPTS } from "@/lib/prompts/registry";

export const metadata: Metadata = { title: "Run" };

// Resume kicks the worker in the background (after()).
export const maxDuration = 800;

const STALL_MS = 3 * 60 * 1000;

/** A running run whose worker lease lapsed and hasn't written anything recently. */
function isStalled(run: Run): boolean {
  if (run.status !== "running" && run.status !== "queued") return false;
  const now = Date.now();
  const leaseLive = run.lease_until && new Date(run.lease_until).getTime() > now;
  return !leaseLive && now - new Date(run.updated_at).getTime() > STALL_MS;
}

const OWNER_LABEL: Record<string, string> = {
  developer: "Developer",
  content: "Content",
  seo: "SEO",
  operator: "You",
};

export default async function RunPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/runs/[runId]">) {
  const operator = await requireOperator();
  const { id, runId } = await params;
  const { flash, error } = await searchParams;
  const [project, run, steps] = await Promise.all([
    getProject(id),
    getRun(runId),
    listSteps(runId),
  ]);
  const def = PROMPTS[run.prompt];
  const page = run.page_id ? await getPage(run.page_id) : null;
  const live = run.status === "running" || run.status === "queued";
  const stalled = isStalled(run);
  const finished = run.status === "review" || run.status === "approved";

  const actions = (
    <>
      {run.status === "review" ? null : live && !stalled ? (
        <form action={cancelRun.bind(null, run.id)}>
          <SubmitButton pendingText="Canceling…" variant="secondary">
            Cancel
          </SubmitButton>
        </form>
      ) : null}
      {stalled || run.status === "failed" ? (
        <form action={resumeRun.bind(null, run.id)}>
          <SubmitButton pendingText="Resuming…">Resume</SubmitButton>
        </form>
      ) : null}
      {finished ? <CopyButton label="Copy all as Markdown" text={runMarkdown(steps)} /> : null}
      {!live ? (
        <ButtonLink
          href={`/projects/${id}/runs/new?prompt=${run.prompt}${run.page_id ? `&page=${run.page_id}` : ""}`}
          variant="secondary"
        >
          Run again
        </ButtonLink>
      ) : null}
    </>
  );

  return (
    <AppShell
      actions={actions}
      backHref={`/projects/${id}/runs`}
      backLabel="Runs"
      description={page ? page.url : `${project.name} · started ${formatDateTime(run.created_at)}`}
      eyebrow={`Prompt ${def.number}`}
      meta={<RunStatusBadge status={run.status} />}
      operatorEmail={operator.email}
      title={def.name}
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />
      <ProjectNav projectId={id} />

      {run.status === "failed" ? (
        <section className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <p className="font-semibold">The run stopped</p>
          <p className="mt-1">{run.error}</p>
          <p className="mt-1 text-red-700">
            Finished sections are kept. Resume picks up at the section that failed.
          </p>
        </section>
      ) : null}
      {stalled ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          The worker hasn&apos;t reported in for a few minutes. It may have been stopped by the
          host. Resume restarts the current section.
        </section>
      ) : null}

      {live ? (
        <RunLive
          initial={{
            status: run.status,
            error: run.error,
            cost_usd: Number(run.cost_usd),
            lease_until: run.lease_until,
            steps: steps.map((s) => ({
              id: s.id,
              idx: s.idx,
              section: s.section,
              status: s.status,
              output_md: s.output_md,
            })),
          }}
          runId={run.id}
        />
      ) : null}

      {run.status === "review" ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Review and approve</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Read it through and edit any section below. Approving makes this the version later
              prompts use
              {run.prompt === "p2"
                ? ", and replaces the planned (not yet started) pages with this plan"
                : ""}
              .
            </p>
          </header>
          <form action={approveRun.bind(null, run.id)} className="space-y-4 px-5 py-4">
            {run.extracted?.error ? (
              <p className="text-sm text-amber-800">{run.extracted.error}</p>
            ) : null}
            {run.prompt === "p2" && run.extracted?.pages ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-950">
                  {run.extracted.pages.length} pages
                </span>{" "}
                will be added to the site plan.
              </p>
            ) : null}
            {run.extracted?.tasks.length ? (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-950">
                  <input
                    className={checkboxClasses}
                    defaultChecked
                    name="include_tasks"
                    type="checkbox"
                  />
                  Add {run.extracted.tasks.length} items to the checklist
                </label>
                <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
                  {run.extracted.tasks.map((t, i) => (
                    <li className="flex items-start gap-3 px-3 py-2 text-sm" key={i}>
                      <span className="type-label mt-0.5 w-20 shrink-0 text-slate-500">
                        {OWNER_LABEL[t.owner]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-900">{t.title}</span>
                        <span className="block text-slate-500">{t.detail}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {t.due_in_days !== null ? `in ${t.due_in_days}d` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <SubmitButton pendingText="Approving…">Approve</SubmitButton>
          </form>
        </section>
      ) : null}

      {finished ||
      run.status === "canceled" ||
      (run.status === "failed" && steps.some((s) => s.status === "done")) ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
          <div className="min-w-0 space-y-4">
            {steps
              .filter((s) => s.status === "done")
              .map((s) => (
                <section
                  className="scroll-mt-16 rounded-lg border border-slate-200 bg-white"
                  id={`step-${s.id}`}
                  key={s.id}
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="type-label text-slate-500">Section {s.idx + 1}</span>
                      {s.edited_md !== null ? <StatusBadge tone="info">Edited</StatusBadge> : null}
                    </div>
                    <CopyButton text={stepText(s)} />
                  </header>
                  <div className="px-5 py-4">
                    <Markdown source={stepText(s)} />
                  </div>
                  {run.status === "review" || run.status === "approved" ? (
                    <details className="border-t border-slate-200 px-5 py-3">
                      <summary className="text-sm font-medium text-slate-600">
                        Edit this section
                      </summary>
                      <form
                        action={saveSectionEdit.bind(null, run.id, s.id)}
                        className="mt-3 space-y-3"
                      >
                        <textarea
                          className={`${textareaClasses} font-mono text-xs leading-5`}
                          defaultValue={stepText(s)}
                          name="markdown"
                          rows={18}
                        />
                        <div className="flex gap-2">
                          <SubmitButton pendingText="Saving…" size="sm">
                            Save section
                          </SubmitButton>
                          {s.edited_md !== null ? (
                            <SubmitButton
                              formAction={revertSectionEdit.bind(null, run.id, s.id)}
                              pendingText="Reverting…"
                              size="sm"
                              variant="ghost"
                            >
                              Revert to Claude&apos;s version
                            </SubmitButton>
                          ) : null}
                        </div>
                        {run.status === "approved" ? (
                          <p className="text-xs text-slate-500">
                            Edits to an approved run flow into the next prompts that use it. Pages
                            and checklist items already created don&apos;t change.
                          </p>
                        ) : null}
                      </form>
                    </details>
                  ) : null}
                </section>
              ))}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">
            <nav aria-label="Sections" className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="type-label mb-2 text-slate-500">Sections</p>
              <ol className="space-y-1 text-[13px]">
                {steps.map((s) => (
                  <li key={s.id}>
                    {s.status === "done" ? (
                      <a className="text-slate-700 hover:text-slate-950" href={`#step-${s.id}`}>
                        {s.section}
                      </a>
                    ) : (
                      <span className="text-slate-400">{s.section}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-[13px]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Cost</dt>
                <dd className="tabular-nums text-slate-900">{formatUsd(Number(run.cost_usd))}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Output tokens</dt>
                <dd className="tabular-nums text-slate-900">
                  {formatTokens(Number(run.output_tokens))}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Web searches</dt>
                <dd className="tabular-nums text-slate-900">{run.web_searches}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Model</dt>
                <dd className="text-slate-900">
                  {run.model} · {run.effort}
                </dd>
              </div>
              {run.approved_at ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Approved</dt>
                  <dd className="text-slate-900">{formatDate(run.approved_at)}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
