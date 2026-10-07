import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { setTaskClientVisible } from "@/lib/actions/client-plan";
import { deleteTask, toggleTask } from "@/lib/actions/tasks";
import type { Task } from "@/lib/db/types";
import { formatDate } from "@/lib/format";

const OWNER_LABEL: Record<string, string> = {
  developer: "Developer",
  content: "Content",
  seo: "SEO",
  operator: "You",
};

/**
 * Checklist rows: a checkbox that toggles done, due date, owner, source run.
 * `clientToggle` adds the "Client sees this" tick for the client plan page.
 */
export function TaskList({
  tasks,
  showProject = false,
  clientToggle = false,
}: {
  tasks: (Task & { project_name?: string })[];
  showProject?: boolean;
  clientToggle?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul className="divide-y divide-slate-200">
      {tasks.map((task) => {
        const done = Boolean(task.done_at);
        const overdue = !done && task.due_on && task.due_on < today;
        // Technical findings are listed under their issue, so the row is the page.
        const technical = task.category === "technical";
        return (
          <li className="flex items-start gap-3 px-5 py-3" key={task.id}>
            <form action={toggleTask.bind(null, task.id, !done)}>
              <button
                aria-label={done ? "Mark not done" : "Mark done"}
                className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-sm border ${
                  done
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-slate-400 bg-white"
                }`}
                type="submit"
              >
                {done ? (
                  <svg
                    aria-hidden
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-950"}`}
              >
                {technical ? (task.url ?? task.title) : task.title}
              </p>
              {technical ? (
                task.note ? (
                  <p className="mt-0.5 text-sm text-slate-500">{task.note}</p>
                ) : null
              ) : task.detail && !done ? (
                <p className="mt-0.5 text-sm text-slate-500">{task.detail}</p>
              ) : null}
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {showProject && task.project_name ? (
                  <Link
                    className="font-medium text-slate-700 hover:underline"
                    href={`/projects/${task.project_id}/checklist`}
                  >
                    {task.project_name}
                  </Link>
                ) : null}
                {task.owner && !technical ? (
                  <span className="type-label">{OWNER_LABEL[task.owner] ?? task.owner}</span>
                ) : null}
                {task.due_on ? (
                  overdue ? (
                    <StatusBadge tone="warning">Due {formatDate(task.due_on)}</StatusBadge>
                  ) : (
                    <span>Due {formatDate(task.due_on)}</span>
                  )
                ) : null}
                {task.source_run_id ? (
                  <Link
                    className="hover:underline"
                    href={`/projects/${task.project_id}/runs/${task.source_run_id}`}
                  >
                    From run
                  </Link>
                ) : null}
              </p>
            </div>
            {clientToggle ? (
              <form action={setTaskClientVisible.bind(null, task.id, !task.client_visible)}>
                <button
                  aria-pressed={task.client_visible}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[13px] font-medium whitespace-nowrap ${
                    task.client_visible
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                  title={
                    task.client_visible ? "Hide from the client plan" : "Show on the client plan"
                  }
                  type="submit"
                >
                  <span aria-hidden>{task.client_visible ? "☑" : "☐"}</span>
                  Client sees this
                </button>
              </form>
            ) : null}
            <form action={deleteTask.bind(null, task.id)}>
              <button
                aria-label="Delete item"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                type="submit"
              >
                ×
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
