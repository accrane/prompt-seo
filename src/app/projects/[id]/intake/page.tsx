import type { Metadata } from "next";

import { DirtySaveButton } from "@/components/admin/dirty-save-button";
import { AppShell } from "@/components/app/app-shell";
import { Flash } from "@/components/app/flash";
import { ProfileField, usedBy } from "@/components/app/profile-field";
import { ProjectNav } from "@/components/app/project-nav";
import { SearchConsoleCard } from "@/components/app/search-console-card";
import { SubmitButton } from "@/components/app/submit-button";
import { Field, inputClasses, textareaClasses } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchFromSite, saveDataSource, saveProfile } from "@/lib/actions/projects";
import { requireOperator } from "@/lib/auth";
import type { DataSource } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { getProject, listDataSources } from "@/lib/projects";
import { VARIABLES, type VariableDef } from "@/lib/prompts/registry";

export const metadata: Metadata = { title: "Intake" };

const SOURCE_BADGE: Record<DataSource["source"], string> = {
  paste: "Pasted",
  upload: "Uploaded",
  fetch: "Fetched",
  gsc: "Search Console",
  pagespeed: "PageSpeed",
};

const GROUPS = ["Business", "Site plan", "Content", "Technical", "Authority"];

function lineCount(text: string): number {
  return text.split("\n").filter((l) => l.trim()).length;
}

function DataSourceCard({
  projectId,
  def,
  saved,
}: {
  projectId: string;
  def: VariableDef;
  saved?: DataSource;
}) {
  const save = saveDataSource.bind(null, projectId);
  const fetchable = def.key === "robots_txt" || def.key === "site_urls";
  return (
    <form action={save} className="space-y-3 px-5 py-4">
      <input name="kind" type="hidden" value={def.key} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{def.label}</h3>
            {saved ? (
              <StatusBadge tone="success">{SOURCE_BADGE[saved.source]}</StatusBadge>
            ) : def.fallback !== undefined ? (
              <StatusBadge>Optional</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Needed</StatusBadge>
            )}
            <span className="type-label text-slate-400">{usedBy(def.key)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{def.hint}</p>
          {saved ? (
            <p className="mt-1 text-xs text-slate-500">
              {lineCount(saved.content).toLocaleString()} lines
              {saved.filename ? ` · ${saved.filename}` : ""} · updated{" "}
              {formatDateTime(saved.updated_at)}
            </p>
          ) : null}
        </div>
        {fetchable ? (
          <SubmitButton
            formAction={fetchFromSite.bind(null, projectId, def.key as "robots_txt" | "site_urls")}
            noValidate
            pendingText="Fetching…"
            size="sm"
            variant="secondary"
          >
            {def.key === "robots_txt" ? "Fetch robots.txt" : "Fetch sitemap"}
          </SubmitButton>
        ) : null}
      </div>
      <textarea
        aria-label={`${def.label} (paste)`}
        className={`${textareaClasses} font-mono text-xs`}
        defaultValue={saved?.content ?? ""}
        name="content"
        placeholder="Paste here, or upload a CSV / text export below."
        rows={saved ? 6 : 3}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          accept=".csv,.tsv,.txt,.xml,.json,text/*"
          className="text-sm text-slate-600 file:mr-3 file:h-7 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2.5 file:text-[13px] file:font-medium file:text-slate-800"
          name="file"
          type="file"
        />
        <SubmitButton pendingText="Saving…" size="sm" variant="secondary">
          Save
        </SubmitButton>
        {saved ? (
          <span className="text-xs text-slate-500">Clear the box and save to remove it.</span>
        ) : null}
      </div>
    </form>
  );
}

export default async function IntakePage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/intake">) {
  const operator = await requireOperator();
  const { id } = await params;
  const { flash, error } = await searchParams;
  const project = await getProject(id);
  const sources = await listDataSources(id);
  const byKind = new Map(sources.map((s) => [s.kind, s]));
  const save = saveProfile.bind(null, id);

  const profileVars = Object.values(VARIABLES).filter(
    (v) => v.source === "profile" && v.key !== "website_url",
  );
  const dataVars = Object.values(VARIABLES).filter((v) => v.source === "data");
  // Required intake fields with no answer yet, in form order.
  const stillEmpty = GROUPS.flatMap((g) => profileVars.filter((v) => v.group === g)).filter(
    (v) => v.fallback === undefined && !String(project.profile[v.key] ?? "").trim(),
  );

  return (
    <AppShell
      backHref="/"
      backLabel="Projects"
      description="Every answer here is reused across the five prompts. Fill in what the next prompt needs; the rest can wait."
      operatorEmail={operator.email}
      title={project.name}
    >
      <Flash
        error={typeof error === "string" ? error : undefined}
        flash={typeof flash === "string" ? flash : undefined}
      />
      <ProjectNav projectId={id} />

      {stillEmpty.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          <span className="font-semibold">Still empty: </span>
          {stillEmpty.map((def, i) => (
            <span key={def.key}>
              {i ? ", " : ""}
              <a className="underline" href={`#field-${def.key}`}>
                {def.label}
              </a>{" "}
              <span className="text-amber-700">({usedBy(def.key)})</span>
            </span>
          ))}
        </section>
      ) : null}

      <form action={save} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Project</h2>
          </header>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field htmlFor="name" label="Project name">
              <input
                className={inputClasses}
                defaultValue={project.name}
                id="name"
                name="name"
                required
              />
            </Field>
            <Field hint={usedBy("website_url")} htmlFor="website_url" label="Website URL">
              <input
                className={inputClasses}
                defaultValue={project.website_url}
                id="website_url"
                name="website_url"
                required
              />
            </Field>
            <div id="budget">
              <Field
                hint="New runs are blocked once this month's Claude spend reaches it."
                htmlFor="monthly_budget_usd"
                label="Monthly Claude budget (USD)"
              >
                <input
                  className={inputClasses}
                  defaultValue={Number(project.monthly_budget_usd)}
                  id="monthly_budget_usd"
                  min={0}
                  name="monthly_budget_usd"
                  step="1"
                  type="number"
                />
              </Field>
            </div>
          </div>
        </section>

        {GROUPS.map((group) => (
          <section className="rounded-lg border border-slate-200 bg-white" key={group}>
            <header className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">{group}</h2>
            </header>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {profileVars
                .filter((v) => v.group === group)
                .map((def) => (
                  <ProfileField def={def} key={def.key} value={project.profile[def.key] ?? ""} />
                ))}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-slate-200 bg-[var(--background)] px-1 py-3">
          <DirtySaveButton>Save intake</DirtySaveButton>
          <span className="text-xs text-slate-500">
            Saves the fields above. Data sources save individually below.
          </span>
        </div>
      </form>

      <section className="scroll-mt-16 rounded-lg border border-slate-200 bg-white" id="data">
        <header className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Data sources</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Exports the prompts read. Pull from Search Console, fetch from the live site, or paste
            or upload an export.
          </p>
        </header>
        <div className="divide-y divide-slate-200">
          <SearchConsoleCard project={project} />
          {dataVars.map((def) => (
            <DataSourceCard def={def} key={def.key} projectId={id} saved={byKind.get(def.key)} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
