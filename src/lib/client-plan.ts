import "server-only";

import { db } from "@/lib/db";
import type { Page, Task } from "@/lib/db/types";

/** The page fields a client may see. Nothing else is selected for /plan. */
const CLIENT_PAGE_COLUMNS =
  "id, url, page_type, canonical_query, job, build_month, action, status" as const;

export type ClientPage = Pick<
  Page,
  "id" | "url" | "page_type" | "canonical_query" | "job" | "build_month" | "action" | "status"
>;

/** The checklist fields a client may see. */
const CLIENT_TASK_COLUMNS = "id, title, detail, due_on, done_at" as const;

export type ClientTask = Pick<Task, "id" | "title" | "detail" | "due_on" | "done_at">;

export type ClientPlan = {
  projectName: string;
  websiteUrl: string;
  /** How many pages the plan schedules per month (the intake's content capacity). */
  pagesPerMonth: number;
  pages: ClientPage[];
  tasks: ClientTask[];
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * The client plan behind a share token, or null when the token is unknown or
 * the link was turned off. This is the one place the service-role client is
 * used without `requireOperator()`: the token is the access check, and only
 * pages and checklist items ticked "client sees this" are returned.
 */
export async function getClientPlan(token: string): Promise<ClientPlan | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const project = await db()
    .from("pseo_projects")
    .select("id, name, website_url, profile")
    .eq("share_token", token)
    .maybeSingle();
  if (project.error) throw new Error(`Load plan: ${project.error.message}`);
  if (!project.data) return null;

  const [pages, tasks] = await Promise.all([
    db()
      .from("pseo_pages")
      .select(CLIENT_PAGE_COLUMNS)
      .eq("project_id", project.data.id)
      .eq("client_visible", true)
      .neq("status", "skipped")
      .order("build_month", { ascending: true, nullsFirst: false })
      .order("created_at")
      .order("url"),
    db()
      .from("pseo_tasks")
      .select(CLIENT_TASK_COLUMNS)
      .eq("project_id", project.data.id)
      .eq("client_visible", true)
      .order("done_at", { ascending: true, nullsFirst: true })
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("sort"),
  ]);
  if (pages.error) throw new Error(`Load plan pages: ${pages.error.message}`);
  if (tasks.error) throw new Error(`Load plan checklist: ${tasks.error.message}`);

  const capacity = Number((project.data.profile as Record<string, string>)?.content_capacity);

  return {
    projectName: project.data.name,
    pagesPerMonth: Number.isInteger(capacity) && capacity > 0 ? capacity : 2,
    websiteUrl: project.data.website_url,
    pages: (pages.data ?? []) as ClientPage[],
    tasks: (tasks.data ?? []) as ClientTask[],
  };
}
