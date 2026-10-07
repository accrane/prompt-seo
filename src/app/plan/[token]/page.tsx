import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { type ClientPage, type ClientTask, getClientPlan } from "@/lib/client-plan";
import type { PageAction, PageStatus } from "@/lib/db/types";
import { formatDate } from "@/lib/format";

// A private link: keep it out of search results and never cache one
// client's plan for another request.
export const metadata: Metadata = {
  title: { absolute: "Recommended website content plan" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<PageAction, string> = {
  new: "New page",
  rewrite: "Rewrite of an existing page",
  merge: "Combines existing pages",
  redirect: "Redirect",
};

type Progress = { label: string; className: string };

// The plan is a recommendation the client carries out, so nothing is
// "planned" on our side until they start it.
const PLANNED: Progress = { label: "Recommended", className: "bg-slate-100 text-slate-700" };
const IN_PROGRESS: Progress = { label: "In progress", className: "bg-amber-100 text-amber-900" };
const LIVE: Progress = { label: "Live", className: "bg-emerald-100 text-emerald-900" };

/** Internal drafting states collapse to the three a client cares about. */
const PROGRESS: Record<PageStatus, Progress> = {
  planned: PLANNED,
  drafting: IN_PROGRESS,
  drafted: IN_PROGRESS,
  published: LIVE,
  skipped: PLANNED,
};

/** The plan's internal page types ("Product or service page (money)") in plain words. */
function clientPageType(pageType: string): string {
  const type = pageType.toLowerCase();
  if (type.includes("pricing")) return "Pricing page";
  if (type.includes("product or service")) return "Service page";
  if (type.includes("pillar")) return "Guide";
  if (type.includes("cluster article")) return "Article";
  if (type.includes("comparison")) return "Comparison page";
  if (type.includes("faq")) return "FAQ page";
  if (type.includes("tool")) return "Tool page";
  return pageType.replace(/\s*\(.*\)\s*$/, "");
}

function PlanPage({ page }: { page: ClientPage }) {
  const progress = PROGRESS[page.status];
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[17px] font-semibold break-all text-slate-950">{page.url}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium ${progress.className}`}
        >
          {progress.label}
        </span>
      </div>
      {page.canonical_query ? (
        <p className="mt-1.5 text-[17px] leading-relaxed text-slate-700">
          For people searching “{page.canonical_query}”
        </p>
      ) : null}
      {page.job ? (
        <p className="mt-1 text-[17px] leading-relaxed text-slate-700">{page.job}</p>
      ) : null}
      <p className="mt-1.5 text-sm text-slate-500">
        {ACTION_LABEL[page.action]}
        {page.page_type ? ` · ${clientPageType(page.page_type)}` : null}
      </p>
    </li>
  );
}

/** Read-only checklist row: the client sees progress but can't tick items. */
function ChecklistItem({ task }: { task: ClientTask }) {
  const done = Boolean(task.done_at);
  return (
    <li className="flex items-start gap-3 py-4">
      <span
        aria-hidden
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          done ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-400 bg-white"
        }`}
      >
        {done ? (
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-semibold text-slate-950">
          <span className="sr-only">{done ? "Done: " : "To do: "}</span>
          {task.title}
        </h3>
        {task.detail ? (
          <p className="mt-1 text-[17px] leading-relaxed text-slate-700">{task.detail}</p>
        ) : null}
        <p className="mt-1.5 text-sm text-slate-500">
          {done
            ? `Done ${formatDate(task.done_at)}`
            : task.due_on
              ? `Suggested by ${formatDate(task.due_on)}`
              : "No date suggested"}
        </p>
      </div>
    </li>
  );
}

function Checklist({ tasks }: { tasks: ClientTask[] }) {
  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);
  return (
    <>
      {[
        { title: "To do", items: open },
        { title: "Done", items: done },
      ]
        .filter((group) => group.items.length)
        .map((group) => (
          <section className="mt-12" key={group.title}>
            <div className="flex items-baseline justify-between gap-4 border-b-2 border-slate-950 pb-2">
              <h2 className="text-xl font-semibold text-slate-950">{group.title}</h2>
              <span className="text-sm text-slate-500">
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="divide-y divide-slate-200">
              {group.items.map((task) => (
                <ChecklistItem key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

export default async function ClientPlanPage({ params, searchParams }: PageProps<"/plan/[token]">) {
  const { token } = await params;
  const plan = await getClientPlan(token);
  if (!plan) notFound();

  // The Checklist tab only exists when there is something on it.
  const hasChecklist = plan.tasks.length > 0;
  const tab = hasChecklist && (await searchParams).tab === "checklist" ? "checklist" : "pages";
  const tasksDone = plan.tasks.filter((t) => t.done_at).length;

  // The client sees only the ticked pages, so re-flow them into months at the
  // plan's pace. Otherwise a month with a hidden page would look half empty.
  const months: ClientPage[][] = [];
  for (let i = 0; i < plan.pages.length; i += plan.pagesPerMonth) {
    months.push(plan.pages.slice(i, i + plan.pagesPerMonth));
  }
  const live = plan.pages.filter((p) => p.status === "published").length;
  const site = plan.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:py-16">
      <header>
        <p className="text-sm font-medium text-slate-500">{site}</p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {plan.projectName}: recommended website content plan
        </h1>
        {hasChecklist ? (
          <nav aria-label="Plan sections" className="mt-8 flex gap-6 border-b border-slate-200">
            {(
              [
                { key: "pages", label: "Pages", count: plan.pages.length, href: `/plan/${token}` },
                {
                  key: "checklist",
                  label: "Checklist",
                  count: plan.tasks.length,
                  href: `/plan/${token}?tab=checklist`,
                },
              ] as const
            ).map((item) => (
              <Link
                aria-current={tab === item.key ? "page" : undefined}
                className={`-mb-px border-b-2 px-1 py-3 text-[17px] font-medium ${
                  tab === item.key
                    ? "border-slate-950 text-slate-950"
                    : "border-transparent text-slate-500 hover:text-slate-950"
                }`}
                href={item.href}
                key={item.key}
              >
                {item.label} <span className="text-sm text-slate-500">{item.count}</span>
              </Link>
            ))}
          </nav>
        ) : null}
        {tab === "checklist" ? (
          <p className="mt-6 text-[17px] leading-relaxed text-slate-700">
            The other steps we recommend alongside the pages. These are yours to complete.{" "}
            {tasksDone} of {plan.tasks.length} done so far.
          </p>
        ) : (
          <>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-700">
              This is the content plan we recommend for your website: the pages to add or rewrite,
              month by month, in the order we&apos;d tackle them. Each page answers a specific
              search your customers make.
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-700">
              It&apos;s a recommendation, not work underway. Building these pages is yours to carry
              out, and the months are a suggested pace that starts whenever you do.
            </p>
            {plan.pages.length ? (
              <p className="mt-3 text-[17px] leading-relaxed text-slate-700">
                {plan.pages.length} page{plan.pages.length === 1 ? "" : "s"} recommended
                {live ? `, ${live} live so far` : ""}.
              </p>
            ) : null}
          </>
        )}
      </header>

      {tab === "checklist" ? (
        <Checklist tasks={plan.tasks} />
      ) : plan.pages.length === 0 ? (
        <p className="mt-10 rounded-lg border border-slate-200 bg-white px-5 py-6 text-[17px] text-slate-700">
          The recommendations are being finalized. Check back soon.
        </p>
      ) : (
        months.map((pages, index) => (
          <section className="mt-12" key={index}>
            <div className="border-b-2 border-slate-950 pb-2">
              <h2 className="text-xl font-semibold text-slate-950">Month {index + 1}</h2>
            </div>
            <ul className="divide-y divide-slate-200">
              {pages.map((page) => (
                <PlanPage key={page.id} page={page} />
              ))}
            </ul>
          </section>
        ))
      )}

      <footer className="mt-16 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-500">
        <p>
          Want a hand with any of this? Reply to the email this link came in. Prepared by Bellaworks
          Web Design.
        </p>
      </footer>
    </main>
  );
}
