import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { TaskList } from "@/components/app/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/lib/auth";
import { listTasks } from "@/lib/projects";

export const metadata: Metadata = { title: "Checklist" };

export default async function ChecklistPage() {
  const operator = await requireOperator();
  const open = (await listTasks()).filter((t) => !t.done_at);

  return (
    <AppShell
      description="Open items across every project, soonest due first."
      operatorEmail={operator.email}
      title="Checklist"
    >
      {open.length ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <TaskList showProject tasks={open} />
        </section>
      ) : (
        <EmptyState description="Approved runs add their action items here." title="Nothing open" />
      )}
    </AppShell>
  );
}
