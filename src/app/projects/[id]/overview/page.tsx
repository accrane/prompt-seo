import type { Metadata } from "next";
import Link from "next/link";

import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AppShell } from "@/components/app/app-shell";
import { Flash } from "@/components/app/flash";
import { ProjectNav } from "@/components/app/project-nav";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOperator } from "@/lib/auth";
import { formatDate, formatUsd } from "@/lib/format";
import {
  getProject,
  listDataSources,
  listPages,
  listRuns,
  listTasks,
  monthSpend,
} from "@/lib/projects";
import { PROMPTS } from "@/lib/prompts/registry";
import { currentBuildMonth, promptStates, recommendations } from "@/lib/recommendations";

export const metadata: Metadata = { title: "Overview" };

const urgencyBadge = {
  due: <StatusBadge tone="warning">Due</StatusBadge>,
  soon: <StatusBadge tone="info">Soon</StatusBadge>,
  info: <StatusBadge>Info</StatusBadge>,
};

export default async function OverviewPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/overview">) {
  const operator = await requireOperator();
  const { id } = await params;
  const { flash, error } = await searchParams;
  const project = await getProject(id);
  const [runs, data, pages, tasks, spent] = await Promise.all([
    listRuns(id),
    listDataSources(id),
    listPages(id),
    listTasks(id),
    monthSpend(id),
  ]);

  const states = promptStates(project, runs, data);
  const recs = recommendations(project, states, pages, tasks);
  const openTasks = tasks.filter((t) => !t.done_at);
  const built = pages.filter((p) => p.status === "drafted" || p.status === "published").length;
  const month = currentBuildMonth(
    states.find((s) => s.prompt === "p2")?.approved?.approved_at ?? null,
  );
  const budget = Number(project.monthly_budget_usd);

  return (
    <AppShell
      backHref="/"
      backLabel="Projects"
      description={project.website_url.replace(/^https?:\/\//, "")}
      operatorEmail={operator.email}
      title={project.name}
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />
      <ProjectNav counts={{ pages: pages.length, tasks: openTasks.length }} projectId={id} />

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">What to do next</h2>
        </header>
        {recs.length ? (
          <ul className="divide-y divide-slate-200">
            {recs.map((r) => (
              <li key={`${r.title}-${r.href}`}>
                <Link
                  className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50"
                  href={r.href}
                >
                  <span className="mt-0.5 shrink-0">{urgencyBadge[r.urgency]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-950">{r.title}</span>
                    <span className="block text-sm text-slate-500">{r.reason}</span>
                  </span>
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-slate-400">
                    <path d="m9 18 6-6-6-6" />
                  </Icon>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">
            Nothing due. Everything is approved and current.
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          hint={
            states.filter((s) => s.approved).length === 5
              ? "All approved"
              : "Approved at least once"
          }
          label="Prompts"
          value={`${states.filter((s) => s.approved).length} of 5`}
        />
        <AdminStatCard
          hint={month ? `Build month ${month} of 12` : "No site plan yet"}
          href={`/projects/${id}/pages`}
          label="Pages built"
          value={pages.length ? `${built} of ${pages.length}` : "—"}
        />
        <AdminStatCard
          href={`/projects/${id}/checklist`}
          label="Open checklist"
          value={String(openTasks.length)}
        />
        <AdminStatCard
          hint={`Budget ${formatUsd(budget, 0)}`}
          href={`/projects/${id}/intake#budget`}
          label="Claude spend this month"
          value={formatUsd(spent)}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">The five prompts</h2>
        </header>
        <ol className="divide-y divide-slate-200">
          {states.map((s) => {
            const def = PROMPTS[s.prompt];
            return (
              <li className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 py-4" key={s.prompt}>
                <div className="min-w-0 flex-1 basis-80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-label text-slate-500">Prompt {def.number}</span>
                    <h3 className="text-sm font-semibold text-slate-950">{def.name}</h3>
                    {s.latest ? (
                      <RunStatusBadge status={s.latest.status} />
                    ) : (
                      <StatusBadge>Not run</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{def.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">When:</span> {def.cadence}
                    {s.approved ? <> · Last approved {formatDate(s.approved.approved_at)}</> : null}
                  </p>
                  {s.missing.length ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Intake still needs: {s.missing.join(", ")}.{" "}
                      <Link className="underline" href={`/projects/${id}/intake`}>
                        Fill in
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {s.latest ? (
                    <ButtonLink href={`/projects/${id}/runs/${s.latest.id}`} size="sm">
                      Latest run
                    </ButtonLink>
                  ) : null}
                  {s.prompt === "p3" ? (
                    <ButtonLink href={`/projects/${id}/pages`} size="sm">
                      Pick a page
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/projects/${id}/runs/new?prompt=${s.prompt}`} size="sm">
                      {s.latest ? "Run again" : "Set up run"}
                    </ButtonLink>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </AppShell>
  );
}
