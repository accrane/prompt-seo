import type { Metadata } from "next";

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
  const [project, tasks] = await Promise.all([getProject(id), listTasks(id)]);
  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);

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
            </header>
            {open.length ? (
              <TaskList tasks={open} />
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
                <TaskList tasks={done} />
              </div>
            </details>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
