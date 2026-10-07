"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth";
import { db, must } from "@/lib/db";

/** Months ticked for the client when a link is first created. */
const DEFAULT_CLIENT_MONTHS = [1, 2];

/**
 * Creates the project's client link (or replaces it, which kills the old
 * URL). If no page is shown to the client yet, months 1 and 2 are ticked.
 */
export async function createClientLink(projectId: string): Promise<void> {
  await requireOperator();
  const share_token = randomBytes(24).toString("base64url");
  must(
    await db().from("pseo_projects").update({ share_token }).eq("id", projectId).select("id"),
    "Create client link",
  );

  const shown = await db()
    .from("pseo_pages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("client_visible", true);
  if (shown.error) throw new Error(`Count client pages: ${shown.error.message}`);
  if (!shown.count) {
    must(
      await db()
        .from("pseo_pages")
        .update({ client_visible: true })
        .eq("project_id", projectId)
        .in("build_month", DEFAULT_CLIENT_MONTHS)
        .select("id"),
      "Show first months to client",
    );
  }
  revalidatePath("/", "layout");
}

/** Turns the client link off. The URL stops working; ticks are kept. */
export async function revokeClientLink(projectId: string): Promise<void> {
  await requireOperator();
  must(
    await db().from("pseo_projects").update({ share_token: null }).eq("id", projectId).select("id"),
    "Turn off client link",
  );
  revalidatePath("/", "layout");
}

export async function setPageClientVisible(pageId: string, visible: boolean): Promise<void> {
  await requireOperator();
  must(
    await db().from("pseo_pages").update({ client_visible: visible }).eq("id", pageId).select("id"),
    "Update page",
  );
  revalidatePath("/", "layout");
}

export async function setTaskClientVisible(taskId: string, visible: boolean): Promise<void> {
  await requireOperator();
  must(
    await db().from("pseo_tasks").update({ client_visible: visible }).eq("id", taskId).select("id"),
    "Update task",
  );
  revalidatePath("/", "layout");
}

/** Turns the answer box for one checklist item on the client page on or off. */
export async function setTaskAsksAnswer(taskId: string, asks: boolean): Promise<void> {
  await requireOperator();
  must(
    await db().from("pseo_tasks").update({ asks_answer: asks }).eq("id", taskId).select("id"),
    "Update task",
  );
  revalidatePath("/", "layout");
}

/** Shows or hides every page in one build month (null = unscheduled). */
export async function setMonthClientVisible(
  projectId: string,
  month: number | null,
  visible: boolean,
): Promise<void> {
  await requireOperator();
  const query = db()
    .from("pseo_pages")
    .update({ client_visible: visible })
    .eq("project_id", projectId);
  must(
    await (month === null ? query.is("build_month", null) : query.eq("build_month", month)).select(
      "id",
    ),
    "Update month",
  );
  revalidatePath("/", "layout");
}
