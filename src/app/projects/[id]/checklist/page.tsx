import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { ProjectNav } from "@/components/app/project-nav";
import { SubmitButton } from "@/components/app/submit-button";
import { TaskList } from "@/components/app/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/form";
import { addTask } from "@/lib/actions/tasks";
import { requireOperator } from "@/lib/auth";
import { getProject, listTasks } from "@/lib/projects";

export const metadata: Metadata = { title: "Checklist" };

export default async function ProjectChecklistPage({
  params,
}: PageProps<"/projects/[id]/checklist">) {
  const operator = await requireOperator();
  const { id } = await params;
  const [project, all] = await Promise.all([getProject(id), listTasks(id)]);
  const tasks = all.filter((t) => t.category !== "technical");
  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);
  const clientShown = tasks.filter((t) => t.client_visible).length;

  // Technical audit findings: one row per affected URL, grouped by issue.
  const technical = new Map<string, typeof all>();
  for (const t of all.filter((t) => t.category === "technical")) {
    technical.set(t.title, [...(technical.get(t.title) ?? []), t]);
  }

  return (
    <AppShell
      backHref="/"
      backLabel="Projects"
      description="Action items pulled from approved runs, plus anything you add. Overdue items show on the overview."
      operatorEmail={operator.email}
      title={project.name}
    >
      <ProjectNav counts={{ tasks: open.length }} projectId={id} />

      <form action={addTask.bind(null, id)} className="flex flex-wrap items-end gap-2">
        <input
          aria-label="New item"
          className={`${inputClasses} max-w-md flex-1`}
          name="title"
          placeholder="Add an item…"
        />
        <input aria-label="Due date" className={`${inputClasses} w-40`} name="due_on" type="date" />
        <SubmitButton pendingText="Adding…" variant="secondary">
          Add
        </SubmitButton>
      </form>

      {tasks.length === 0 ? (
        <EmptyState
          description="Approving a run adds its action items here: Prompt 4's 30-day sprint, Prompt 5's 90-day plan, what a page needs before publishing."
          title="Nothing on the checklist"
        />
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Open · {open.length}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {clientShown} of {tasks.length} items ticked &quot;Client sees this&quot; appear on
                the client plan page&apos;s Checklist tab.{" "}
                <Link className="underline" href={`/projects/${id}/pages`}>
                  Client link
                </Link>
              </p>
            </header>
            {open.length ? (
              <TaskList clientToggle tasks={open} />
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500">All done.</p>
            )}
          </section>
          {done.length ? (
            <details className="rounded-lg border border-slate-200 bg-white">
              <summary className="px-5 py-3 text-sm font-semibold text-slate-950">
                Done · {done.length}
              </summary>
              <div className="border-t border-slate-200">
                <TaskList clientToggle tasks={done} />
              </div>
            </details>
          ) : null}
        </>
      )}

      {[...technical].map(([issue, items]) => (
        <details className="rounded-lg border border-slate-200 bg-white" key={issue}>
          <summary className="px-5 py-3">
            <span className="text-sm font-semibold text-slate-950">
              Technical issue: {issue} · {items.filter((t) => !t.done_at).length} of {items.length}{" "}
              open
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {items.filter((t) => t.client_visible).length} shown on the client plan page&apos;s
              Technical Issues tab. {items[0].detail}
            </span>
          </summary>
          <div className="border-t border-slate-200">
            <TaskList clientToggle tasks={items} />
          </div>
        </details>
      ))}
    </AppShell>
  );
}
