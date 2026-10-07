import { SubmitButton } from "@/components/app/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { selectClasses } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { pullFromSearchConsole, setSearchConsoleProperty } from "@/lib/actions/google";
import type { Project } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { accessToken, googleConfigured, listConnections } from "@/lib/google/oauth";
import { listSites, matchProperty, type GscSite } from "@/lib/google/search-console";

/** Intake card: pick the project's Search Console property and pull its data. */
export async function SearchConsoleCard({ project }: { project: Project }) {
  const intake = `/projects/${project.id}/intake`;
  const connections = googleConfigured() ? await listConnections() : [];

  // Every property each connected account can see, labelled by account.
  const options: { value: string; label: string; site: GscSite; connectionId: string }[] = [];
  const errors: string[] = [];
  for (const c of connections) {
    try {
      const sites = await listSites(await accessToken(c.id));
      for (const site of sites) {
        options.push({
          value: `${c.id}|${site.siteUrl}`,
          label: connections.length > 1 ? `${site.siteUrl} (${c.email})` : site.siteUrl,
          site,
          connectionId: c.id,
        });
      }
    } catch (err) {
      errors.push(`${c.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const current = project.gsc_property
    ? `${project.google_connection_id}|${project.gsc_property}`
    : "";
  const suggested =
    current ||
    (() => {
      const match = matchProperty(
        options.map((o) => o.site),
        project.website_url,
      );
      return options.find((o) => o.site.siteUrl === match)?.value ?? "";
    })();

  return (
    <div className="scroll-mt-16 space-y-3 px-5 py-4" id="search-console">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-950">Google Search Console</h3>
        {project.gsc_property ? (
          <StatusBadge tone="success">Connected</StatusBadge>
        ) : (
          <StatusBadge>Not connected</StatusBadge>
        )}
        <span className="type-label text-slate-400">Prompts 1, 4</span>
      </div>
      <p className="text-sm text-slate-500">
        Pulls the last 12 months of queries (Prompt 1), and the top pages with year-over-year clicks
        plus striking-distance queries (Prompt 4). Pulling replaces those two data sources below.
      </p>

      {!googleConfigured() ? (
        <p className="text-sm text-amber-800">
          Google isn&apos;t set up yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and
          CREDENTIALS_KEY (see Settings).
        </p>
      ) : connections.length === 0 ? (
        <ButtonLink
          href={`/api/google/connect?next=${encodeURIComponent(`${intake}#search-console`)}`}
          size="sm"
          variant="primary"
        >
          Connect Google account
        </ButtonLink>
      ) : (
        <>
          {errors.map((e) => (
            <p className="text-sm text-red-700" key={e}>
              {e}
            </p>
          ))}
          <form
            action={setSearchConsoleProperty.bind(null, project.id)}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              aria-label="Search Console property"
              className={`${selectClasses} max-w-md`}
              defaultValue={suggested}
              name="property"
            >
              <option value="">Choose a property…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SubmitButton pendingText="Saving…" size="sm" variant="secondary">
              Use this property
            </SubmitButton>
          </form>
          {project.gsc_property ? (
            <form
              action={pullFromSearchConsole.bind(null, project.id)}
              className="flex flex-wrap items-center gap-3"
            >
              <SubmitButton pendingText="Pulling…" size="sm">
                Pull from Search Console
              </SubmitButton>
              <span className="text-xs text-slate-500">
                {project.gsc_pulled_at
                  ? `Last pulled ${formatDateTime(project.gsc_pulled_at)}`
                  : "Not pulled yet"}
              </span>
            </form>
          ) : suggested && !current ? (
            <p className="text-xs text-slate-500">
              Matched the property for this site. Save it to pull data.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
