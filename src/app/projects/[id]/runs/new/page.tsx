import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { Flash } from "@/components/app/flash";
import { ProfileField } from "@/components/app/profile-field";
import { ProjectNav } from "@/components/app/project-nav";
import { SubmitButton } from "@/components/app/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Field, selectClasses, textareaClasses } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { saveMissingFields } from "@/lib/actions/projects";
import { startRun } from "@/lib/actions/runs";
import { requireOperator } from "@/lib/auth";
import { DEFAULT_EFFORT, EFFORT_LEVELS, RUN_MODEL } from "@/lib/claude";
import { formatUsd } from "@/lib/format";
import { getProject, listPages, monthSpend } from "@/lib/projects";
import { PROMPT_IDS, PROMPTS, VARIABLES, type PromptId } from "@/lib/prompts/registry";
import { prepareRun } from "@/lib/runs/inputs";

export const metadata: Metadata = { title: "New run" };

// startRun kicks off the first sections in the background (after()); give it
// the same room as the worker route.
export const maxDuration = 800;

const SOURCE_LABEL: Record<string, string> = {
  profile: "Intake",
  data: "Data",
  output: "Earlier prompt",
  runtime: "This run",
};

const EFFORT_HINT: Record<string, string> = {
  low: "Fastest and cheapest. Fine for a quick first pass.",
  medium: "Balanced.",
  high: "Recommended for these prompts.",
  xhigh: "Slowest and most thorough. Costs noticeably more.",
};

function preview(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > 160 ? `${oneLine.slice(0, 160)}…` : oneLine;
}

export default async function NewRunPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/runs/new">) {
  const operator = await requireOperator();
  const { id } = await params;
  const query = await searchParams;
  const prompt = (PROMPT_IDS.includes(query.prompt as PromptId) ? query.prompt : "p1") as PromptId;
  const pageId = typeof query.page === "string" ? query.page : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;

  const project = await getProject(id);
  const def = PROMPTS[prompt];
  const [prepared, spent, pages] = await Promise.all([
    prepareRun(project, prompt, { pageId }),
    monthSpend(id),
    prompt === "p3" ? listPages(id) : Promise.resolve([]),
  ]);
  const budget = Number(project.monthly_budget_usd);
  const overBudget = spent >= budget;

  // Runtime fields are typed on this page, so they don't block it.
  const runtimeKeys = new Set(
    Object.values(VARIABLES)
      .filter((v) => v.source === "runtime")
      .map((v) => v.label),
  );
  const missing = prepared.missing.filter((m) => !runtimeKeys.has(m));
  const blocked = prepared.blockers.length > 0 || missing.length > 0 || overBudget;
  // Missing intake answers can be filled in right here; missing data sources can't.
  const missingDefs = Object.values(VARIABLES).filter((v) => missing.includes(v.label));
  const missingProfile = missingDefs.filter((v) => v.source === "profile");
  const missingData = missingDefs.filter((v) => v.source !== "profile").map((v) => v.label);
  const start = startRun.bind(null, id);

  return (
    <AppShell
      backHref={`/projects/${id}/runs`}
      backLabel="Runs"
      description={def.summary}
      eyebrow={`Prompt ${def.number}`}
      operatorEmail={operator.email}
      title={def.name}
    >
      <Flash error={error} />
      <ProjectNav projectId={id} />

      <nav aria-label="Prompt" className="flex flex-wrap gap-1">
        {PROMPT_IDS.map((p) => (
          <Link
            aria-current={p === prompt ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-semibold transition ${
              p === prompt
                ? "border-slate-300 bg-white text-slate-950"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            href={`/projects/${id}/runs/new?prompt=${p}`}
            key={p}
          >
            {PROMPTS[p].number}. {PROMPTS[p].name}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">When to run:</span> {def.cadence}
      </p>

      {prepared.blockers.length || missing.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Not ready yet</p>
          {prepared.blockers.length ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {prepared.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {missingProfile.length ? (
            <form
              action={saveMissingFields.bind(
                null,
                id,
                `/projects/${id}/runs/new?prompt=${prompt}${pageId ? `&page=${pageId}` : ""}`,
              )}
              className="mt-3 space-y-4 rounded-md border border-amber-200 bg-white p-4 text-slate-900"
            >
              <p className="text-sm text-slate-600">Fill in what this prompt still needs:</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {missingProfile.map((def) => (
                  <ProfileField def={def} key={def.key} value="" wide />
                ))}
              </div>
              <SubmitButton pendingText="Saving…" size="sm">
                Save and continue
              </SubmitButton>
            </form>
          ) : null}
          {missingData.length ? (
            <p className="mt-2">
              Data needed: {missingData.join(", ")}.{" "}
              <Link className="underline" href={`/projects/${id}/intake#data`}>
                Add it on the intake page
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {prompt === "p3" && !prepared.page ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Pick a page to build</h2>
          </header>
          {pages.filter((p) => p.status === "planned").length ? (
            <ul className="divide-y divide-slate-200">
              {pages
                .filter((p) => p.status === "planned")
                .map((p) => (
                  <li key={p.id}>
                    <Link
                      className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-slate-50"
                      href={`/projects/${id}/runs/new?prompt=p3&page=${p.id}`}
                    >
                      <span className="type-label w-16 shrink-0 text-slate-500">
                        {p.build_month ? `Month ${p.build_month}` : "Unscheduled"}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-950">
                        {p.url}
                      </span>
                      <span className="hidden truncate text-slate-500 sm:block">
                        {p.canonical_query}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-slate-500">
              No planned pages. Approve a Prompt 2 run to create the site plan.
            </p>
          )}
        </section>
      ) : null}

      <form action={start} className="space-y-6">
        <input name="prompt" type="hidden" value={prompt} />
        {prepared.page ? <input name="page_id" type="hidden" value={prepared.page.id} /> : null}

        {prompt === "p3" && prepared.page ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">This page</h2>
              <ButtonLink href={`/projects/${id}/runs/new?prompt=p3`} size="sm" variant="ghost">
                Pick another
              </ButtonLink>
            </header>
            <div className="space-y-5 p-5">
              <pre className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 whitespace-pre-wrap text-slate-700">
                {prepared.inputs.find((i) => i.key === "page_row")?.value}
              </pre>
              <Field
                hint={VARIABLES.proprietary_material.hint}
                htmlFor="proprietary_material"
                label="Proprietary material"
              >
                <textarea
                  className={textareaClasses}
                  id="proprietary_material"
                  name="proprietary_material"
                  rows={5}
                />
              </Field>
              <Field
                hint={VARIABLES.current_top_results.hint}
                htmlFor="current_top_results"
                label="Current top results (optional)"
              >
                <textarea
                  className={textareaClasses}
                  id="current_top_results"
                  name="current_top_results"
                  rows={3}
                />
              </Field>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-950">What gets filled in</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Each [VARIABLE] in the prompt and where its value comes from.
            </p>
          </header>
          <ul className="divide-y divide-slate-200">
            {prepared.inputs
              .filter((i) => !(prompt === "p3" && VARIABLES[i.key].source === "runtime"))
              .map((input) => (
                <li
                  className="grid gap-1 px-5 py-2.5 text-sm sm:grid-cols-[200px_110px_1fr] sm:gap-3"
                  key={input.key}
                >
                  <span className="font-medium text-slate-900">{input.label}</span>
                  <span className="type-label self-center text-slate-500">
                    {SOURCE_LABEL[input.source]}
                  </span>
                  <span className="min-w-0 text-slate-600">
                    {input.value === null ? (
                      <StatusBadge tone="danger">Missing</StatusBadge>
                    ) : input.usedFallback ? (
                      <span className="text-slate-400">{input.value}</span>
                    ) : (
                      <span className="block truncate">{preview(input.value)}</span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
          <details className="border-t border-slate-200 px-5 py-3">
            <summary className="text-sm font-medium text-slate-700">
              Show the full prompt Claude will get
            </summary>
            <pre className="mt-3 max-h-[480px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 whitespace-pre-wrap text-slate-700">
              {prepared.promptText}
            </pre>
          </details>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              hint={`Model: ${RUN_MODEL}. ${EFFORT_HINT[DEFAULT_EFFORT]}`}
              htmlFor="effort"
              label="Effort"
            >
              <select
                className={selectClasses}
                defaultValue={DEFAULT_EFFORT}
                id="effort"
                name="effort"
              >
                {EFFORT_LEVELS.map((e) => (
                  <option key={e} value={e}>
                    {e} — {EFFORT_HINT[e]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="text-sm text-slate-600">
              <p className="type-label mb-1.5 text-slate-500">Budget</p>
              <p>
                {formatUsd(spent)} of {formatUsd(budget, 0)} spent this month.
                {overBudget ? (
                  <span className="mt-1 block text-red-700">
                    Budget reached.{" "}
                    <Link className="underline" href={`/projects/${id}/intake#budget`}>
                      Raise it
                    </Link>{" "}
                    to run more.
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Runs {def.sections.length} sections, one at a time, with web search. Expect several
                minutes.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <SubmitButton
              disabled={blocked || (prompt === "p3" && !prepared.page)}
              pendingText="Starting…"
            >
              Start run
            </SubmitButton>
            <span className="text-xs text-slate-500">
              You can leave the page; the run continues on the server.
            </span>
          </div>
        </section>
      </form>
    </AppShell>
  );
}
