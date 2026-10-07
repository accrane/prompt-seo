import "server-only";

const API = "https://searchconsole.googleapis.com/webmasters/v3";

export type GscSite = { siteUrl: string; permissionLevel: string };

async function gsc<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Search Console: ${json?.error?.message ?? `HTTP ${res.status}`}`);
  }
  return json as T;
}

export async function listSites(token: string): Promise<GscSite[]> {
  const { siteEntry } = await gsc<{ siteEntry?: GscSite[] }>(token, "/sites");
  return (siteEntry ?? [])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}

/** The property that best matches a site URL: the domain property first, then the URL prefix. */
export function matchProperty(sites: GscSite[], websiteUrl: string): string | null {
  const host = new URL(websiteUrl).hostname.replace(/^www\./, "");
  const domain = sites.find((s) => s.siteUrl === `sc-domain:${host}`);
  if (domain) return domain.siteUrl;
  const prefix = sites.find((s) => {
    if (s.siteUrl.startsWith("sc-domain:")) return false;
    return new URL(s.siteUrl).hostname.replace(/^www\./, "") === host;
  });
  return prefix?.siteUrl ?? null;
}

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function analytics(
  token: string,
  property: string,
  dimensions: string[],
  startDate: string,
  endDate: string,
  rowLimit: number,
): Promise<Row[]> {
  const { rows } = await gsc<{ rows?: Row[] }>(
    token,
    `/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    { startDate, endDate, dimensions, rowLimit, type: "web" },
  );
  return rows ?? [];
}

function day(offsetDays: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const pct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
const pos = (p: number) => p.toFixed(1);

/**
 * The Search Console data both prompts ask for:
 * - queries: top 1,000 queries for the last 12 months, like the Performance
 *   export (Prompt 1).
 * - pages: top 200 pages by impressions with year-over-year clicks, plus
 *   striking-distance queries (Prompt 4). The page indexing report isn't in
 *   the API, so it's noted for pasting.
 */
export async function pullSearchConsole(token: string, property: string) {
  // Search Console data runs about 3 days behind.
  const end = day(-3);
  const yearStart = day(-364, new Date(end));
  const quarterStart = day(-89, new Date(end));
  const lastYearEnd = day(-365, new Date(end));
  const lastYearStart = day(-365, new Date(quarterStart));

  const [queries, pagesNow, pagesLastYear, queryPages] = await Promise.all([
    analytics(token, property, ["query"], yearStart, end, 1000),
    analytics(token, property, ["page"], quarterStart, end, 5000),
    analytics(token, property, ["page"], lastYearStart, lastYearEnd, 5000),
    analytics(token, property, ["query", "page"], quarterStart, end, 25000),
  ]);

  const queriesCsv = [
    `Search Console, ${property}: top queries ${yearStart} to ${end} (last 12 months), by clicks.`,
    "Top queries,Clicks,Impressions,CTR,Position",
    ...queries.map((r) =>
      [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pos(r.position)].map(csvCell).join(","),
    ),
  ].join("\n");

  const lastYear = new Map(pagesLastYear.map((r) => [r.keys[0], r.clicks]));
  const topPages = [...pagesNow].sort((a, b) => b.impressions - a.impressions).slice(0, 200);
  const striking = queryPages
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 200);

  const pagesReport = [
    `Search Console, ${property}. Pulled ${day(0)}.`,
    "Page indexing report: not available through the Search Console API. If you have it, paste its summary (and the Crawled / Discovered – currently not indexed URLs) at the end of this box.",
    "",
    `Top 200 pages by impressions, ${quarterStart} to ${end} (last 3 months), with clicks for the same 3 months last year (${lastYearStart} to ${lastYearEnd}):`,
    "Page,Clicks,Impressions,CTR,Position,Clicks same period last year",
    ...topPages.map((r) =>
      [
        r.keys[0],
        r.clicks,
        r.impressions,
        pct(r.ctr),
        pos(r.position),
        lastYear.get(r.keys[0]) ?? 0,
      ]
        .map(csvCell)
        .join(","),
    ),
    "",
    `Striking distance: queries at average position 4–20 with 10+ impressions, ${quarterStart} to ${end}, top 200 by impressions:`,
    "Query,Page,Clicks,Impressions,CTR,Position",
    ...striking.map((r) =>
      [r.keys[0], r.keys[1], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  return {
    queriesCsv,
    pagesReport,
    counts: { queries: queries.length, pages: topPages.length, striking: striking.length },
  };
}
