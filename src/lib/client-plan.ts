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

/**
 * The checklist fields a client may see. Rows are read whole so the page still
 * loads on a database without the later migrations' columns, then cut down to
 * these.
 */
function toClientTask(row: Task): ClientTask {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    due_on: row.due_on,
    done_at: row.done_at,
    category: row.category ?? "checklist",
    url: row.url ?? null,
    note: row.note ?? null,
    asks_answer: row.asks_answer ?? false,
    client_answer: row.client_answer ?? null,
    client_answered_at: row.client_answered_at ?? null,
  };
}

export type ClientTask = Pick<
  Task,
  | "id"
  | "title"
  | "detail"
  | "due_on"
  | "done_at"
  | "category"
  | "url"
  | "note"
  | "asks_answer"
  | "client_answer"
  | "client_answered_at"
>;

export type ClientPlan = {
  projectName: string;
  websiteUrl: string;
  /** How many pages the plan schedules per month (the intake's content capacity). */
  pagesPerMonth: number;
  pages: ClientPage[];
  tasks: ClientTask[];
  /** Audit findings, one per affected URL. */
  technical: ClientTask[];
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

/** The project a share token opens, or null. Used to check public writes. */
export async function projectIdForToken(token: string): Promise<string | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data, error } = await db()
    .from("pseo_projects")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw new Error(`Check plan link: ${error.message}`);
  return data?.id ?? null;
}

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
      .select("*")
      .eq("project_id", project.data.id)
      .eq("client_visible", true)
      .order("done_at", { ascending: true, nullsFirst: true })
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("sort"),
  ]);
  if (pages.error) throw new Error(`Load plan pages: ${pages.error.message}`);
  if (tasks.error) throw new Error(`Load plan checklist: ${tasks.error.message}`);

  const clientTasks = ((tasks.data ?? []) as Task[]).map(toClientTask);
  const capacity = Number((project.data.profile as Record<string, string>)?.content_capacity);

  return {
    projectName: project.data.name,
    pagesPerMonth: Number.isInteger(capacity) && capacity > 0 ? capacity : 2,
    websiteUrl: project.data.website_url,
    pages: (pages.data ?? []) as ClientPage[],
    tasks: clientTasks.filter((t) => t.category !== "technical"),
    technical: clientTasks.filter((t) => t.category === "technical"),
  };
}
