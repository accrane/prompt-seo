import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { CopyButton } from "@/components/app/copy-button";
import { Flash } from "@/components/app/flash";
import { ProjectNav } from "@/components/app/project-nav";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { selectClasses } from "@/components/ui/form";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import {
  createClientLink,
  revokeClientLink,
  setMonthClientVisible,
  setPageClientVisible,
} from "@/lib/actions/client-plan";
import { setPageStatus } from "@/lib/actions/tasks";
import { requireOperator } from "@/lib/auth";
import type { Page, PageStatus } from "@/lib/db/types";
import { getProject, latestApprovedRun, listPages } from "@/lib/projects";
import { currentBuildMonth } from "@/lib/recommendations";
import { clientPlanOrigin } from "@/lib/request";

export const metadata: Metadata = { title: "Pages" };

const STATUS: Record<PageStatus, { tone: BadgeTone; label: string }> = {
  planned: { tone: "neutral", label: "Planned" },
  drafting: { tone: "info", label: "Drafting" },
  drafted: { tone: "warning", label: "Drafted" },
  published: { tone: "success", label: "Published" },
  skipped: { tone: "neutral", label: "Skipped" },
};

function PageRow({
  page,
  projectId,
  month,
}: {
  page: Page;
  projectId: string;
  month: number | null;
}) {
  const overdue =
    page.status === "planned" &&
    month !== null &&
    page.build_month !== null &&
    page.build_month < month;
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3">
      <div className="min-w-0 flex-1 basis-72">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-950">{page.url}</span>
          <StatusBadge tone={STATUS[page.status].tone}>{STATUS[page.status].label}</StatusBadge>
          {page.action !== "new" ? <StatusBadge tone="info">{page.action}</StatusBadge> : null}
          {overdue ? <StatusBadge tone="warning">Behind</StatusBadge> : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          {page.canonical_query ? <>“{page.canonical_query}”</> : null}
          {page.page_type ? <span className="text-slate-400"> · {page.page_type}</span> : null}
          {page.intent ? <span className="text-slate-400"> · {page.intent}</span> : null}
        </p>
        {page.job ? <p className="mt-0.5 text-xs text-slate-500">{page.job}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <form action={setPageClientVisible.bind(null, page.id, !page.client_visible)}>
          <button
            aria-pressed={page.client_visible}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[13px] font-medium ${
              page.client_visible
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
            title={page.client_visible ? "Hide from the client plan" : "Show on the client plan"}
            type="submit"
          >
            <span aria-hidden>{page.client_visible ? "☑" : "☐"}</span>
            Client sees this
          </button>
        </form>
        {page.draft_run_id ? (
          <ButtonLink href={`/projects/${projectId}/runs/${page.draft_run_id}`} size="sm">
            Draft
          </ButtonLink>
        ) : null}
        {page.status === "planned" ? (
          <ButtonLink
            href={`/projects/${projectId}/runs/new?prompt=p3&page=${page.id}`}
            size="sm"
            variant="primary"
          >
            Build this page
          </ButtonLink>
        ) : null}
        {page.status !== "drafting" ? (
          <form action={setPageStatus.bind(null, page.id)} className="flex items-center gap-1">
            <select
              aria-label="Page status"
              className={`${selectClasses} h-7 w-32 text-[13px]`}
              defaultValue={page.status}
              name="status"
            >
              <option value="planned">Planned</option>
              <option value="drafted">Drafted</option>
              <option value="published">Published</option>
              <option value="skipped">Skipped</option>
            </select>
            <button
              className="h-7 rounded-md px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
              type="submit"
            >
              Set
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

function ClientPlanCard({
  projectId,
  link,
  shown,
  total,
}: {
  projectId: string;
  link: string | null;
  shown: number;
  total: number;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <h2 className="text-sm font-semibold text-slate-950">Client plan page</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {link
              ? `A read-only page for the client. It lists the ${shown} of ${total} pages ticked "Client sees this" and nothing else, plus any checklist items ticked on the Checklist tab.`
              : "A read-only page you can send the client. It lists only the pages you tick, and creating the link ticks months 1 and 2 to start."}
          </p>
          {link ? <p className="mt-2 font-mono text-xs break-all text-slate-700">{link}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {link ? (
            <>
              <CopyButton label="Copy link" text={link} />
              <a
                className={buttonClasses("secondary", "sm")}
                href={link}
                rel="noreferrer"
                target="_blank"
              >
                See what they see
              </a>
              <form action={revokeClientLink.bind(null, projectId)}>
                <button className={buttonClasses("ghost", "sm")} type="submit">
                  Turn off link
                </button>
              </form>
            </>
          ) : (
            <form action={createClientLink.bind(null, projectId)}>
              <button className={buttonClasses("primary", "sm")} type="submit">
                Create client link
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function PagesPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/pages">) {
  const operator = await requireOperator();
  const { id } = await params;
  const { flash, error } = await searchParams;
  const [project, pages, plan] = await Promise.all([
    getProject(id),
    listPages(id),
    latestApprovedRun(id, "p2"),
  ]);
  const month = currentBuildMonth(plan?.approved_at ?? null);
  const clientLink = project.share_token
    ? `${await clientPlanOrigin()}/plan/${project.share_token}`
    : null;
  const clientShown = pages.filter((p) => p.client_visible && p.status !== "skipped").length;

  const byMonth = new Map<number | null, Page[]>();
  for (const page of pages) {
    const key = page.build_month;
    byMonth.set(key, [...(byMonth.get(key) ?? []), page]);
  }
  const months = [...byMonth.keys()].sort((a, b) => (a ?? 99) - (b ?? 99));

  return (
    <AppShell
      backHref="/"
      backLabel="Projects"
      description={
        month
          ? `The site plan from Prompt 2, by build month. You're in month ${month} of 12.`
          : "The site plan from Prompt 2, by build month."
      }
      operatorEmail={operator.email}
      title={project.name}
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />
      <ProjectNav counts={{ pages: pages.length }} projectId={id} />

      {pages.length ? (
        <ClientPlanCard link={clientLink} projectId={id} shown={clientShown} total={pages.length} />
      ) : null}

      {pages.length === 0 ? (
        <EmptyState
          action={
            <ButtonLink href={`/projects/${id}/runs/new?prompt=p2`} variant="primary">
              Set up Prompt 2
            </ButtonLink>
          }
          description="Approve a Prompt 2 (Topical Sovereignty Blueprint) run and its cluster map and build calendar become this list."
          title="No site plan yet"
        />
      ) : (
        months.map((m) => (
          <section className="rounded-lg border border-slate-200 bg-white" key={m ?? "none"}>
            <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">
                {m ? `Month ${m}` : "Unscheduled"}
              </h2>
              {m !== null && month === m ? <StatusBadge tone="info">Now</StatusBadge> : null}
              <span className="text-xs text-slate-500">
                {
                  byMonth.get(m)!.filter((p) => p.status === "drafted" || p.status === "published")
                    .length
                }{" "}
                of {byMonth.get(m)!.length} built
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                {byMonth.get(m)!.filter((p) => p.client_visible).length} shown to client
                <form action={setMonthClientVisible.bind(null, id, m, true)}>
                  <button className={buttonClasses("ghost", "sm")} type="submit">
                    Show all
                  </button>
                </form>
                <form action={setMonthClientVisible.bind(null, id, m, false)}>
                  <button className={buttonClasses("ghost", "sm")} type="submit">
                    Hide all
                  </button>
                </form>
              </span>
            </header>
            <ul className="divide-y divide-slate-200">
              {byMonth.get(m)!.map((page) => (
                <PageRow key={page.id} month={month} page={page} projectId={id} />
              ))}
            </ul>
          </section>
        ))
      )}
      {pages.length ? (
        <p className="text-xs text-slate-500">
          Drafts are read in the app. Copy a draft&apos;s sections into WordPress, then mark the
          page Published.{" "}
          <Link className="underline" href={`/projects/${id}/runs`}>
            All runs
          </Link>
        </p>
      ) : null}
    </AppShell>
  );
}
