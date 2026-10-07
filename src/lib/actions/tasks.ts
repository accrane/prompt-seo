"use server";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth";
import { db, must } from "@/lib/db";
import type { PageStatus } from "@/lib/db/types";

export async function toggleTask(taskId: string, done: boolean): Promise<void> {
  await requireOperator();
  must(
    await db()
      .from("pseo_tasks")
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq("id", taskId)
      .select("id"),
    "Update task",
  );
  revalidatePath("/", "layout");
}

export async function addTask(projectId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const due = String(formData.get("due_on") ?? "").trim();
  must(
    await db()
      .from("pseo_tasks")
      .insert({ project_id: projectId, title, owner: "operator", due_on: due || null })
      .select("id"),
    "Add task",
  );
  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string): Promise<void> {
  await requireOperator();
  must(await db().from("pseo_tasks").delete().eq("id", taskId).select("id"), "Delete task");
  revalidatePath("/", "layout");
}

const PAGE_STATUSES: PageStatus[] = ["planned", "drafted", "published", "skipped"];

export async function setPageStatus(pageId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const status = String(formData.get("status")) as PageStatus;
  if (!PAGE_STATUSES.includes(status)) return;
  must(
    await db().from("pseo_pages").update({ status }).eq("id", pageId).select("id"),
    "Update page",
  );
  revalidatePath("/", "layout");
}
