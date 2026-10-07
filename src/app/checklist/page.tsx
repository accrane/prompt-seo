import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { TaskList } from "@/components/app/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/lib/auth";
import { listTasks } from "@/lib/projects";

export const metadata: Metadata = { title: "Checklist" };

export default async function ChecklistPage() {
  const operator = await requireOperator();
  // Audit findings and Google Business Profile items stay on their project's
  // checklist; they would drown this list. Rows from before the category
  // column existed count as checklist items.
  const open = (await listTasks()).filter(
    (t) => !t.done_at && (t.category ?? "checklist") === "checklist",
  );

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
