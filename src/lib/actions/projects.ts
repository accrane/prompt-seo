"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withError, withFlash } from "@/components/app/flash";
import { requireOperator } from "@/lib/auth";
import { db, must } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { VARIABLES } from "@/lib/prompts/registry";
import { fetchRobots, fetchSitemapUrls } from "@/lib/site-fetch";

function normalizeUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
}

const newProject = z.object({
  name: z.string().trim().min(1, "Give the project a name."),
  website_url: z.string().trim().min(3, "Enter the website URL."),
  wpm_site_id: z.string().uuid().optional(),
});

export async function createProject(formData: FormData): Promise<void> {
  await requireOperator();
  const parsed = newProject.safeParse({
    name: formData.get("name"),
    website_url: formData.get("website_url"),
    wpm_site_id: formData.get("wpm_site_id") || undefined,
  });
  if (!parsed.success) redirect(withError("/projects/new", parsed.error.issues[0].message));

  const website_url = normalizeUrl(parsed.data.website_url);
  const [created] = must(
    await db()
      .from("pseo_projects")
      .insert({
        name: parsed.data.name,
        website_url,
        wpm_site_id: parsed.data.wpm_site_id ?? null,
        profile: { business_name: parsed.data.name },
      })
      .select("id"),
    "Create project",
  ) as { id: string }[];

  redirect(
    withFlash(`/projects/${created.id}/intake`, "Project created. Fill in the intake next."),
  );
}

/** Saves every profile field present in the form; blank clears a field. */
export async function saveProfile(projectId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const project = await getProject(projectId);
  const profile = { ...project.profile };

  for (const def of Object.values(VARIABLES)) {
    if (def.source !== "profile" || def.key === "website_url") continue;
    const value = formData.get(def.key);
    if (value === null) continue;
    const text = String(value).trim();
    if (text) profile[def.key] = text;
    else delete profile[def.key];
  }

  const website = String(formData.get("website_url") ?? "").trim();
  const budget = Number(formData.get("monthly_budget_usd"));

  must(
    await db()
      .from("pseo_projects")
      .update({
        profile,
        name: String(formData.get("name") ?? "").trim() || project.name,
        website_url: website ? normalizeUrl(website) : project.website_url,
        monthly_budget_usd:
          Number.isFinite(budget) && budget >= 0 ? budget : project.monthly_budget_usd,
      })
      .eq("id", projectId)
      .select("id"),
    "Save intake",
  );
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(withFlash(`/projects/${projectId}/intake`, "Intake saved."));
}

const DATA_KINDS = Object.values(VARIABLES)
  .filter((v) => v.source === "data")
  .map((v) => v.key);

async function upsertData(
  projectId: string,
  kind: string,
  content: string,
  source: "paste" | "upload" | "fetch",
  filename: string | null = null,
) {
  must(
    await db()
      .from("pseo_data_sources")
      .upsert(
        { project_id: projectId, kind, content, source, filename },
        { onConflict: "project_id,kind" },
      )
      .select("id"),
    "Save data source",
  );
}

/** Paste box or file upload for one data source. An uploaded file wins. */
export async function saveDataSource(projectId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const kind = String(formData.get("kind"));
  const back = `/projects/${projectId}/intake#data`;
  if (!DATA_KINDS.includes(kind)) redirect(withError(back, "Unknown data source."));

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024)
      redirect(withError(back, "That file is over 5 MB. Trim it first."));
    await upsertData(projectId, kind, await file.text(), "upload", file.name);
  } else {
    const content = String(formData.get("content") ?? "").trim();
    if (!content) {
      must(
        await db()
          .from("pseo_data_sources")
          .delete()
          .eq("project_id", projectId)
          .eq("kind", kind)
          .select("id"),
        "Clear data source",
      );
      revalidatePath(`/projects/${projectId}`, "layout");
      redirect(withFlash(back, `${VARIABLES[kind].label} cleared.`));
    }
    await upsertData(projectId, kind, content, "paste");
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(withFlash(back, `${VARIABLES[kind].label} saved.`));
}

/** Pulls robots.txt or the sitemap URL list straight from the live site. */
export async function fetchFromSite(
  projectId: string,
  kind: "robots_txt" | "site_urls",
): Promise<void> {
  await requireOperator();
  const project = await getProject(projectId);
  const back = `/projects/${projectId}/intake#data`;

  if (kind === "robots_txt") {
    const robots = await fetchRobots(project.website_url);
    if (!robots) redirect(withError(back, `Couldn't fetch ${project.website_url}/robots.txt.`));
    await upsertData(projectId, kind, robots, "fetch", "robots.txt");
  } else {
    const { urls, sitemaps } = await fetchSitemapUrls(project.website_url);
    if (!urls.length) redirect(withError(back, "No sitemap found. Paste a URL list instead."));
    await upsertData(projectId, kind, urls.join("\n"), "fetch", sitemaps.join(", "));
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(withFlash(back, `${VARIABLES[kind].label} fetched from the site.`));
}

export async function archiveProject(projectId: string): Promise<void> {
  await requireOperator();
  must(
    await db()
      .from("pseo_projects")
      .update({ status: "archived" })
      .eq("id", projectId)
      .select("id"),
    "Archive project",
  );
  redirect(withFlash("/", "Project archived."));
}

/**
 * Fills in only the profile fields present in the form (the run page's
 * "fill in what's missing" box), then returns to that page.
 */
export async function saveMissingFields(
  projectId: string,
  back: string,
  formData: FormData,
): Promise<void> {
  await requireOperator();
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : `/projects/${projectId}`;
  const project = await getProject(projectId);
  const profile = { ...project.profile };
  let saved = 0;
  for (const def of Object.values(VARIABLES)) {
    if (def.source !== "profile" || def.key === "website_url") continue;
    const text = String(formData.get(def.key) ?? "").trim();
    if (!text) continue;
    profile[def.key] = text;
    saved++;
  }
  if (!saved) redirect(withError(safeBack, "Nothing to save. Fill in at least one field."));
  must(
    await db().from("pseo_projects").update({ profile }).eq("id", projectId).select("id"),
    "Save intake",
  );
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(withFlash(safeBack, `Saved ${saved} field${saved === 1 ? "" : "s"}.`));
}
