"use server";

import { redirect } from "next/navigation";

import { db, must } from "@/lib/db";
import { projectIdForToken } from "@/lib/client-plan";

/** Longest answer a client can save; plenty for a list of services. */
const MAX_ANSWER_CHARS = 4000;

/**
 * Saves the client's answer to one checklist item from the public plan page.
 * There is no signed-in user here: the share token is the access check, and
 * the write is limited to the answer on an item that is on that project's
 * client page and was set to ask for one.
 */
export async function saveClientAnswer(
  token: string,
  taskId: string,
  formData: FormData,
): Promise<void> {
  const projectId = await projectIdForToken(token);
  // An unknown or switched-off link: the plan page says so.
  if (!projectId) redirect(`/plan/${token}`);

  const answer = String(formData.get("answer") ?? "")
    .trim()
    .slice(0, MAX_ANSWER_CHARS);
  must(
    await db()
      .from("pseo_tasks")
      .update({
        client_answer: answer || null,
        client_answered_at: answer ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("client_visible", true)
      .eq("asks_answer", true)
      .select("id"),
    "Save answer",
  );
  redirect(`/plan/${token}?tab=checklist&saved=${taskId}#item-${taskId}`);
}
