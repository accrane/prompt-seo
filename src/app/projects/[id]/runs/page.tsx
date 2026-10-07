import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { ProjectNav } from "@/components/app/project-nav";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHead, TableRow } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { requireOperator } from "@/lib/auth";
import { formatDateTime, formatUsd } from "@/lib/format";
import { getProject, listPages, listRuns } from "@/lib/projects";
import { PROMPTS } from "@/lib/prompts/registry";

export const metadata: Metadata = { title: "Runs" };

export default async function RunsPage({ params }: PageProps<"/projects/[id]/runs">) {
  const operator = await requireOperator();
  const { id } = await params;
  const project = await getProject(id);
  const [runs, pages] = await Promise.all([listRuns(id), listPages(id)]);
  const pageUrl = new Map(pages.map((p) => [p.id, p.url]));

  return (
    <AppShell
      actions={
        <ButtonLink href={`/projects/${id}/runs/new?prompt=p1`} variant="primary">
          New run
        </ButtonLink>
      }
      backHref="/"
      backLabel="Projects"
      description="Every run of every prompt, newest first. Approved runs are the ones later prompts build on."
      operatorEmail={operator.email}
      title={project.name}
    >
      <ProjectNav projectId={id} />
      {runs.length === 0 ? (
        <EmptyState
          action={
            <ButtonLink href={`/projects/${id}/runs/new?prompt=p1`} variant="primary">
              Set up Prompt 1
            </ButtonLink>
          }
          description="Start with Prompt 1, Demand Cartography. Everything else builds on it."
          title="No runs yet"
        />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white">
          <Table columns="minmax(240px,2fr) 140px 150px 90px">
            <TableHead>
              <span>Prompt</span>
              <span>Status</span>
              <span>Started</span>
              <span className="text-right">Cost</span>
            </TableHead>
            {runs.map((run) => (
              <Link
                className="block transition hover:bg-slate-50"
                href={`/projects/${id}/runs/${run.id}`}
                key={run.id}
              >
                <TableRow>
                  <span className="min-w-0">
                    <span className="type-label mr-2 text-slate-500">
                      P{PROMPTS[run.prompt].number}
                    </span>
                    <span className="font-medium text-slate-950">{PROMPTS[run.prompt].name}</span>
                    {run.page_id ? (
                      <span className="block truncate text-xs text-slate-500">
                        {pageUrl.get(run.page_id)}
                      </span>
                    ) : null}
                  </span>
                  <span>
                    <RunStatusBadge status={run.status} />
                  </span>
                  <span className="text-slate-600">{formatDateTime(run.created_at)}</span>
                  <span className="text-right tabular-nums text-slate-700">
                    {formatUsd(Number(run.cost_usd))}
                  </span>
                </TableRow>
              </Link>
            ))}
          </Table>
        </section>
      )}
    </AppShell>
  );
}
