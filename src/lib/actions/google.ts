"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { withError, withFlash } from "@/components/app/flash";
import { requireOperator } from "@/lib/auth";
import { db, must } from "@/lib/db";
import { accessToken } from "@/lib/google/oauth";
import { pullSearchConsole } from "@/lib/google/search-console";
import { getProject } from "@/lib/projects";

export async function disconnectGoogle(connectionId: string): Promise<void> {
  await requireOperator();
  must(
    await db().from("pseo_google_connections").delete().eq("id", connectionId).select("id"),
    "Disconnect Google",
  );
  revalidatePath("/", "layout");
  redirect(
    withFlash(
      "/settings",
      "Google account disconnected. Revoke access in your Google account too if you're done with it.",
    ),
  );
}

/** Saves which Search Console property a project uses. */
export async function setSearchConsoleProperty(
  projectId: string,
  formData: FormData,
): Promise<void> {
  await requireOperator();
  const back = `/projects/${projectId}/intake#search-console`;
  const [connectionId, property] = String(formData.get("property") ?? "").split("|");
  must(
    await db()
      .from("pseo_projects")
      .update({ google_connection_id: connectionId || null, gsc_property: property || null })
      .eq("id", projectId)
      .select("id"),
    "Save property",
  );
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(withFlash(back, property ? `Using ${property}.` : "Search Console property cleared."));
}

/** Pulls queries (Prompt 1) and pages + striking distance (Prompt 4) into data sources. */
export async function pullFromSearchConsole(projectId: string): Promise<void> {
  await requireOperator();
  const back = `/projects/${projectId}/intake#search-console`;
  const project = await getProject(projectId);
  if (!project.google_connection_id || !project.gsc_property) {
    redirect(withError(back, "Pick a Search Console property first."));
  }

  let result: Awaited<ReturnType<typeof pullSearchConsole>>;
  try {
    const token = await accessToken(project.google_connection_id);
    result = await pullSearchConsole(token, project.gsc_property);
  } catch (err) {
    redirect(withError(back, err instanceof Error ? err.message : String(err)));
  }

  must(
    await db()
      .from("pseo_data_sources")
      .upsert(
        [
          {
            project_id: projectId,
            kind: "gsc_queries",
            content: result.queriesCsv,
            source: "gsc",
            filename: project.gsc_property,
          },
          {
            project_id: projectId,
            kind: "gsc_pages",
            content: result.pagesReport,
            source: "gsc",
            filename: project.gsc_property,
          },
        ],
        { onConflict: "project_id,kind" },
      )
      .select("id"),
    "Save Search Console data",
  );
  must(
    await db()
      .from("pseo_projects")
      .update({ gsc_pulled_at: new Date().toISOString() })
      .eq("id", projectId)
      .select("id"),
    "Record pull",
  );

  revalidatePath(`/projects/${projectId}`, "layout");
  const { queries, pages, striking } = result.counts;
  redirect(
    withFlash(
      back,
      `Pulled ${queries} queries, ${pages} pages and ${striking} striking-distance queries from Search Console.`,
    ),
  );
}
