import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { Flash } from "@/components/app/flash";
import { SubmitButton } from "@/components/app/submit-button";
import { Field, inputClasses, selectClasses } from "@/components/ui/form";
import { createProject } from "@/lib/actions/projects";
import { requireOperator } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New project" };

/** WP Manager's sites, for linking. Empty if WP Manager isn't installed in this database. */
async function wpManagerSites(): Promise<{ id: string; name: string; url: string }[]> {
  const { data, error } = await db()
    .from("wpm_sites")
    .select("id, name, url")
    .eq("status", "active")
    .order("name");
  return error ? [] : (data as { id: string; name: string; url: string }[]);
}

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const operator = await requireOperator();
  const { error } = await searchParams;
  const sites = await wpManagerSites();

  return (
    <AppShell
      backHref="/"
      backLabel="Projects"
      description="The rest of the intake comes next. You can fill it in over time; each prompt tells you what it still needs."
      operatorEmail={operator.email}
      title="New project"
    >
      <Flash error={typeof error === "string" ? error : undefined} />
      <form
        action={createProject}
        className="max-w-xl space-y-5 rounded-lg border border-slate-200 bg-white p-5"
      >
        <Field htmlFor="name" label="Business name">
          <input className={inputClasses} id="name" name="name" required />
        </Field>
        <Field hint="The site this SEO work is for." htmlFor="website_url" label="Website URL">
          <input
            className={inputClasses}
            id="website_url"
            name="website_url"
            placeholder="https://example.com"
            required
          />
        </Field>
        {sites.length ? (
          <Field
            hint="Optional. Links this project to the site in WP Manager."
            htmlFor="wpm_site_id"
            label="WP Manager site"
          >
            <select className={selectClasses} defaultValue="" id="wpm_site_id" name="wpm_site_id">
              <option value="">Not linked</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.url.replace(/^https?:\/\//, "")})
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <SubmitButton pendingText="Creating…">Create project</SubmitButton>
      </form>
    </AppShell>
  );
}
