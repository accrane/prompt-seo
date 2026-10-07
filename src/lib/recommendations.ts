import type { DataSource, Page, Project, Run, Task } from "@/lib/db/types";
import { PROMPT_IDS, PROMPTS, promptVariables, type PromptId } from "@/lib/prompts/registry";

const DAY = 24 * 60 * 60 * 1000;

export type Recommendation = {
  prompt: PromptId | null;
  title: string;
  reason: string;
  href: string;
  urgency: "due" | "soon" | "info";
};

export type PromptState = {
  prompt: PromptId;
  latest: Run | null;
  approved: Run | null;
  /** Required intake fields and data still empty for this prompt. */
  missing: string[];
};

function daysSince(iso: string | null | undefined): number {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : Infinity;
}

/** Month of the 12-month build calendar we're in, counted from the plan's approval. */
export function currentBuildMonth(planApprovedAt: string | null): number | null {
  if (!planApprovedAt) return null;
  return Math.min(12, Math.floor(daysSince(planApprovedAt) / 30) + 1);
}

export function promptStates(project: Project, runs: Run[], data: DataSource[]): PromptState[] {
  const have = new Set([
    ...Object.entries(project.profile)
      .filter(([, v]) => String(v ?? "").trim())
      .map(([k]) => k),
    "website_url",
    ...data.map((d) => d.kind),
  ]);
  return PROMPT_IDS.map((prompt) => {
    const mine = runs.filter((r) => r.prompt === prompt);
    return {
      prompt,
      latest: mine[0] ?? null,
      approved:
        mine
          .filter((r) => r.status === "approved")
          .sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? ""))[0] ?? null,
      missing: promptVariables(prompt)
        .filter((v) => (v.source === "profile" || v.source === "data") && v.fallback === undefined)
        .filter((v) => !have.has(v.key))
        // The crawl export falls back to the sitemap.
        .filter((v) => !(v.key === "crawl_export" && have.has("site_urls")))
        .map((v) => v.label),
    };
  });
}

/**
 * What to do next for a project, most urgent first. Encodes the doc's
 * operating rhythm: 1 → 2 once, pages monthly from the build calendar,
 * the diagnostic quarterly, authority work after the plan exists.
 */
export function recommendations(
  project: Project,
  states: PromptState[],
  pages: Page[],
  tasks: Task[],
): Recommendation[] {
  const base = `/projects/${project.id}`;
  const s = Object.fromEntries(states.map((x) => [x.prompt, x])) as Record<PromptId, PromptState>;
  const out: Recommendation[] = [];
  const runHref = (p: PromptId) => `${base}/runs/new?prompt=${p}`;

  const inFlight = states.filter(
    (x) => x.latest && ["queued", "running"].includes(x.latest.status),
  );
  for (const x of inFlight) {
    out.push({
      prompt: x.prompt,
      title: `Prompt ${PROMPTS[x.prompt].number} is running`,
      reason: "Watch it write, section by section.",
      href: `${base}/runs/${x.latest!.id}`,
      urgency: "info",
    });
  }
  for (const x of states.filter((y) => y.latest?.status === "review")) {
    out.push({
      prompt: x.prompt,
      title: `Review Prompt ${PROMPTS[x.prompt].number}: ${PROMPTS[x.prompt].name}`,
      reason: "Finished and waiting for you. Later prompts only use approved output.",
      href: `${base}/runs/${x.latest!.id}`,
      urgency: "due",
    });
  }

  const busy = (p: PromptId) =>
    s[p].latest && ["queued", "running", "review"].includes(s[p].latest!.status);

  // Prompt 1: once at setup, again yearly.
  if (!busy("p1")) {
    if (!s.p1.approved) {
      out.push({
        prompt: "p1",
        title: "Run Prompt 1: Demand Cartography",
        reason: s.p1.missing.length
          ? `Everything else builds on it. Fill in first: ${s.p1.missing.join(", ")}.`
          : "Everything else builds on it.",
        href: s.p1.missing.length ? `${base}/intake` : runHref("p1"),
        urgency: "due",
      });
    } else if (daysSince(s.p1.approved.approved_at) > 365) {
      out.push({
        prompt: "p1",
        title: "Refresh the demand map",
        reason: "It's over a year old. Search behavior and AI answers have moved since.",
        href: runHref("p1"),
        urgency: "soon",
      });
    }
  }

  // Prompt 2: after each approved Prompt 1.
  if (s.p1.approved && !busy("p2")) {
    const stale =
      s.p2.approved && (s.p2.approved.approved_at ?? "") < (s.p1.approved.approved_at ?? "");
    if (!s.p2.approved || stale) {
      out.push({
        prompt: "p2",
        title: stale
          ? "Re-plan the site from the new demand map"
          : "Run Prompt 2: Topical Sovereignty Blueprint",
        reason: s.p2.missing.length
          ? `Turns the demand map into a page plan. Fill in first: ${s.p2.missing.join(", ")}.`
          : "Turns the demand map into a page plan and build calendar.",
        href: s.p2.missing.length ? `${base}/intake` : runHref("p2"),
        urgency: "due",
      });
    }
  }

  // Prompt 3: the pages the calendar says should exist by now.
  const month = currentBuildMonth(s.p2.approved?.approved_at ?? null);
  if (month !== null) {
    const due = pages.filter(
      (p) => p.status === "planned" && p.build_month !== null && p.build_month <= month,
    );
    if (due.length) {
      out.push({
        prompt: "p3",
        title: `Build ${due.length} page${due.length === 1 ? "" : "s"} due by month ${month}`,
        reason: `Next up: ${due[0].url}${due[0].canonical_query ? ` (“${due[0].canonical_query}”)` : ""}.`,
        href: `${base}/pages`,
        urgency: due.some((p) => (p.build_month ?? 0) < month) ? "due" : "soon",
      });
    }
  }

  // Prompt 4: quarterly.
  if (!busy("p4")) {
    const age = daysSince(s.p4.approved?.approved_at);
    if (age > 90) {
      out.push({
        prompt: "p4",
        title: s.p4.approved
          ? "Quarterly diagnostic is due"
          : "Run Prompt 4: Crawl-to-Citation Diagnostic",
        reason: s.p4.approved
          ? `The last one was ${age} days ago.`
          : "Checks the live site, including whether AI crawlers can reach it. Paste Search Console and PageSpeed data for the best result.",
        href: runHref("p4"),
        urgency: s.p4.approved ? "due" : "soon",
      });
    } else if (age > 76) {
      out.push({
        prompt: "p4",
        title: "Quarterly diagnostic due soon",
        reason: `Due in ${90 - age} days. Refresh the Search Console and PageSpeed exports first.`,
        href: `${base}/intake#data`,
        urgency: "info",
      });
    }
  }

  // Prompt 5: once the demand map exists; quarterly after.
  if (s.p1.approved && !busy("p5")) {
    const age = daysSince(s.p5.approved?.approved_at);
    if (!s.p5.approved) {
      out.push({
        prompt: "p5",
        title: "Run Prompt 5: Authority Gravity Engine",
        reason: "The off-site half: the sources AI engines pull from, PR, reviews, community.",
        href: s.p5.missing.length ? `${base}/intake` : runHref("p5"),
        urgency: "soon",
      });
    } else if (age > 90) {
      out.push({
        prompt: "p5",
        title: "Refresh the authority plan",
        reason: `The last one was ${age} days ago, and more pages have corroboration targets since.`,
        href: runHref("p5"),
        urgency: "soon",
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => !t.done_at && t.due_on && t.due_on < today);
  if (overdue.length) {
    out.push({
      prompt: null,
      title: `${overdue.length} checklist item${overdue.length === 1 ? " is" : "s are"} overdue`,
      reason: overdue[0].title,
      href: `${base}/checklist`,
      urgency: "due",
    });
  }

  const rank = { due: 0, soon: 1, info: 2 };
  return out.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
}
