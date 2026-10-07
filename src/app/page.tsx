import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { Flash } from "@/components/app/flash";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHead, TableRow } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOperator } from "@/lib/auth";
import { formatUsd } from "@/lib/format";
import {
  listDataSources,
  listPages,
  listProjects,
  listRuns,
  listTasks,
  monthSpend,
} from "@/lib/projects";
import { promptStates, recommendations } from "@/lib/recommendations";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/">) {
  const operator = await requireOperator();
  const { flash, error } = await searchParams;
  const projects = await listProjects();

  const rows = await Promise.all(
    projects.map(async (project) => {
      const [runs, data, pages, tasks, spent] = await Promise.all([
        listRuns(project.id),
        listDataSources(project.id),
        listPages(project.id),
        listTasks(project.id),
        monthSpend(project.id),
      ]);
      const states = promptStates(project, runs, data);
      const next = recommendations(project, states, pages, tasks)[0] ?? null;
      const approved = states.filter((s) => s.approved).length;
      return { project, next, approved, spent };
    }),
  );

  return (
    <AppShell
      actions={
        <ButtonLink href="/projects/new" variant="primary">
          New project
        </ButtonLink>
      }
      description="One project per client site. Each runs the five-prompt system and tracks what to do next."
      operatorEmail={operator.email}
      title="Projects"
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />

      {rows.length === 0 ? (
        <EmptyState
          action={
            <ButtonLink href="/projects/new" variant="primary">
              New project
            </ButtonLink>
          }
          description="Start with your own site. You'll fill in an intake form, then run Prompt 1."
          title="No projects yet"
        />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white">
          <Table columns="minmax(200px,1.2fr) 110px minmax(260px,2fr) 110px">
            <TableHead>
              <span>Project</span>
              <span>Prompts</span>
              <span>Next step</span>
              <span className="text-right">This month</span>
            </TableHead>
            {rows.map(({ project, next, approved, spent }) => (
              <Link
                className="block transition hover:bg-slate-50"
                href={`/projects/${project.id}/overview`}
                key={project.id}
              >
                <TableRow>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">
                      {project.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {project.website_url.replace(/^https?:\/\//, "")}
                    </span>
                  </span>
                  <span className="tabular-nums text-slate-700">{approved} of 5</span>
                  <span className="min-w-0">
                    {next ? (
                      <span className="flex min-w-0 items-center gap-2">
                        {next.urgency === "due" ? (
                          <StatusBadge tone="warning">Due</StatusBadge>
                        ) : null}
                        <span className="truncate text-slate-700">{next.title}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Nothing due</span>
                    )}
                  </span>
                  <span className="text-right tabular-nums text-slate-700">
                    {formatUsd(spent)}
                    <span className="text-slate-400">
                      {" "}
                      / {formatUsd(Number(project.monthly_budget_usd), 0)}
                    </span>
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
