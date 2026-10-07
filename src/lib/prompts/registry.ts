import p1 from "@/lib/prompts/text/p1";
import p2 from "@/lib/prompts/text/p2";
import p3 from "@/lib/prompts/text/p3";
import p4 from "@/lib/prompts/text/p4";
import p5 from "@/lib/prompts/text/p5";

export type PromptId = "p1" | "p2" | "p3" | "p4" | "p5";
export const PROMPT_IDS: PromptId[] = ["p1", "p2", "p3", "p4", "p5"];

/**
 * Where a variable's value comes from:
 * - profile: the intake form (entered once per project, reused everywhere)
 * - data: an export or fetched file (pseo_data_sources, one per kind)
 * - output: an approved earlier run, chained in by the app
 * - runtime: entered when starting a specific run (Prompt 3's page inputs)
 */
export type VariableSource = "profile" | "data" | "output" | "runtime";

export type VariableDef = {
  key: string;
  label: string;
  source: VariableSource;
  /** Guidance shown under the field; mirrors the doc's bracket text. */
  hint: string;
  input?: "text" | "textarea" | "number" | "list";
  /** Used when the value is blank. Undefined means the run can't start without it. */
  fallback?: string;
  /** Intake grouping. */
  group?: string;
};

export const VARIABLES: Record<string, VariableDef> = {
  // --- Business profile -------------------------------------------------
  business_name: {
    key: "business_name",
    label: "Business name",
    source: "profile",
    hint: "The name as customers know it.",
    group: "Business",
  },
  website_url: {
    key: "website_url",
    label: "Website URL",
    source: "profile",
    hint: "The site being optimized, e.g. https://example.com",
    group: "Business",
  },
  business_description: {
    key: "business_description",
    label: "What you sell and to whom",
    source: "profile",
    hint: "One paragraph. Also used as the brand description in Prompt 5.",
    input: "textarea",
    group: "Business",
  },
  primary_offer: {
    key: "primary_offer",
    label: "Primary product or service",
    source: "profile",
    hint: "The main thing this SEO work should sell.",
    group: "Business",
  },
  ideal_customer: {
    key: "ideal_customer",
    label: "Ideal customer",
    source: "profile",
    hint: "Who buys, their role or situation, and what triggers the purchase.",
    input: "textarea",
    group: "Business",
  },
  geography: {
    key: "geography",
    label: "Geography",
    source: "profile",
    hint: "Global, a country, or a city/region.",
    group: "Business",
  },
  price_and_cycle: {
    key: "price_and_cycle",
    label: "Price point and sales cycle",
    source: "profile",
    hint: "E.g. $49/month self-serve, or $20K enterprise with a 3-month cycle.",
    group: "Business",
  },
  competitors: {
    key: "competitors",
    label: "Competitors",
    source: "profile",
    hint: "Up to three, one per line. Names or URLs.",
    input: "list",
    group: "Business",
  },

  // --- Site plan (Prompt 2) --------------------------------------------
  core_topic: {
    key: "core_topic",
    label: "Core topic",
    source: "profile",
    hint: "The one topic this site should own.",
    group: "Site plan",
  },
  content_capacity: {
    key: "content_capacity",
    label: "Pages per month",
    source: "profile",
    hint: "How many pages you can realistically publish each month.",
    input: "number",
    group: "Site plan",
  },
  conversion_points: {
    key: "conversion_points",
    label: "Conversion points",
    source: "profile",
    hint: "What visitors should do: demo, trial, call, purchase, email.",
    group: "Site plan",
  },
  constraints: {
    key: "constraints",
    label: "Constraints",
    source: "profile",
    hint: "Topics you can't cover, compliance limits, brand voice notes.",
    input: "textarea",
    fallback: "None.",
    group: "Site plan",
  },

  // --- Content (Prompt 3) ----------------------------------------------
  author: {
    key: "author",
    label: "Author",
    source: "profile",
    hint: "Name, role, and why they are credible on this topic.",
    input: "textarea",
    group: "Content",
  },
  voice: {
    key: "voice",
    label: "Voice",
    source: "profile",
    hint: "Three adjectives and a one-paragraph sample of your writing.",
    input: "textarea",
    group: "Content",
  },
  conversion_link: {
    key: "conversion_link",
    label: "Conversion",
    source: "profile",
    hint: "What the reader should do, and the exact link.",
    group: "Content",
  },

  // --- Technical (Prompt 4) --------------------------------------------
  platform: {
    key: "platform",
    label: "Platform",
    source: "profile",
    hint: "CMS, hosting, and whether it is JavaScript-rendered. E.g. WordPress on Flywheel, server-rendered.",
    group: "Technical",
  },

  // --- Authority (Prompt 5) --------------------------------------------
  spokesperson: {
    key: "spokesperson",
    label: "Spokesperson",
    source: "profile",
    hint: "Name, title, credentials, and anything notable they have done.",
    input: "textarea",
    group: "Authority",
  },
  existing_profiles: {
    key: "existing_profiles",
    label: "Existing profiles",
    source: "profile",
    hint: "LinkedIn, Crunchbase, G2, Capterra, Trustpilot, Google Business Profile, Wikidata, YouTube, X, Reddit, others.",
    input: "textarea",
    group: "Authority",
  },
  assets: {
    key: "assets",
    label: "Assets",
    source: "profile",
    hint: "Original data, customer counts, case study results, tools, templates, research, or strong opinions you can publish.",
    input: "textarea",
    group: "Authority",
  },
  budget_time: {
    key: "budget_time",
    label: "Budget and time",
    source: "profile",
    hint: "Monthly budget for PR, outreach and content, plus hours per week.",
    group: "Authority",
  },

  // --- Data sources ----------------------------------------------------
  gsc_queries: {
    key: "gsc_queries",
    label: "Search Console queries (12 months)",
    source: "data",
    hint: "Search Console → Performance → Queries, last 12 months, export.",
    fallback: "NONE",
  },
  site_urls: {
    key: "site_urls",
    label: "Current site URLs",
    source: "data",
    hint: 'Your sitemap or a list of existing URLs with titles. Type "NEW SITE" if there is none.',
  },
  crawl_export: {
    key: "crawl_export",
    label: "Crawl export",
    source: "data",
    hint: "Screaming Frog, Sitebulb or similar: status codes, titles, canonicals, indexability, crawl depth, inlinks. Falls back to the sitemap.",
  },
  gsc_pages: {
    key: "gsc_pages",
    label: "Search Console pages + indexing",
    source: "data",
    hint: "Page indexing report summary, plus the top 200 pages by impressions with clicks, CTR and position.",
    fallback: "NOT PROVIDED",
  },
  pagespeed: {
    key: "pagespeed",
    label: "PageSpeed / CrUX",
    source: "data",
    hint: "LCP, INP, CLS for the homepage, one money page and one content page.",
    fallback: "NOT PROVIDED",
  },
  robots_txt: {
    key: "robots_txt",
    label: "robots.txt",
    source: "data",
    hint: "Fetched from the site, or pasted.",
    fallback: "NOT PROVIDED",
  },
  analytics: {
    key: "analytics",
    label: "Analytics landing pages",
    source: "data",
    hint: "Top 20 organic landing pages by sessions with conversion rate, if you have it.",
    fallback: "NOT PROVIDED",
  },
  backlinks: {
    key: "backlinks",
    label: "Backlink summary",
    source: "data",
    hint: "Referring domain count, top 20 linking domains, top linked pages, if you have them.",
    fallback: "NOT PROVIDED",
  },

  // --- Chained outputs -------------------------------------------------
  p1_output: {
    key: "p1_output",
    label: "Prompt 1 output",
    source: "output",
    hint: "The approved Demand Cartography run.",
  },
  p2_cluster_map: {
    key: "p2_cluster_map",
    label: "Prompt 2 cluster map",
    source: "output",
    hint: "The Cluster Map section of the approved site plan.",
    fallback: "NO SITE PLAN YET. Audit the live site on its own.",
  },
  p1_gatekeepers: {
    key: "p1_gatekeepers",
    label: "Citation gatekeepers",
    source: "output",
    hint: "From the approved Prompt 1 SERP and AI-Source Landscape.",
  },
  p3_corroboration: {
    key: "p3_corroboration",
    label: "Corroboration targets",
    source: "output",
    hint: "From every approved Prompt 3 page.",
    fallback: "No pages built yet.",
  },

  // --- Per-run inputs (Prompt 3) --------------------------------------
  page_row: {
    key: "page_row",
    label: "Page to build",
    source: "runtime",
    hint: "The row from the site plan.",
  },
  proprietary_material: {
    key: "proprietary_material",
    label: "Proprietary material",
    source: "runtime",
    hint: "Original data, customer results, internal processes, tests you have run, or opinions the competition does not hold.",
    input: "textarea",
    fallback: "NONE PROVIDED",
  },
  current_top_results: {
    key: "current_top_results",
    label: "Current top results",
    source: "runtime",
    hint: "Titles and URLs of the current top 5. Leave blank to have Claude retrieve them with web search.",
    input: "textarea",
    fallback: "Retrieve them with web search.",
  },
};

/** Exact bracket text in the doc → variable key (or competitor slot). */
export const TOKEN_MAP: Record<string, string> = {
  "[YOUR BUSINESS NAME]": "business_name",
  "[YOUR WEBSITE URL]": "website_url",
  "[YOUR PRIMARY PRODUCT/SERVICE]": "primary_offer",
  "[ONE PARAGRAPH ON WHAT YOU SELL AND TO WHOM]": "business_description",
  "[ONE-PARAGRAPH DESCRIPTION]": "business_description",
  "[WHO BUYS, THEIR ROLE OR SITUATION, WHAT TRIGGERS THE PURCHASE]": "ideal_customer",
  "[GLOBAL / COUNTRY / CITY]": "geography",
  "[GEOGRAPHY]": "geography",
  "[E.G. $49/MONTH SELF-SERVE, OR $20K ENTERPRISE WITH A 3-MONTH CYCLE]": "price_and_cycle",
  "[COMPETITOR 1]": "competitors.0",
  "[COMPETITOR 2]": "competitors.1",
  "[COMPETITOR 3]": "competitors.2",
  '[PASTE YOUR SEARCH CONSOLE QUERY EXPORT FOR THE LAST 12 MONTHS, OR WRITE "NONE"]': "gsc_queries",
  "[PASTE THE FULL OUTPUT OF PROMPT 1]": "p1_output",
  "[THE ONE TOPIC YOU WANT TO OWN]": "core_topic",
  "[CORE TOPIC]": "core_topic",
  '[PASTE YOUR SITEMAP OR A LIST OF EXISTING URLS WITH TITLES, OR WRITE "NEW SITE"]': "site_urls",
  "[NUMBER OF PAGES YOU CAN PUBLISH PER MONTH]": "content_capacity",
  "[NUMBER OF PAGES PER MONTH]": "content_capacity",
  "[WHAT YOU WANT VISITORS TO DO: DEMO, TRIAL, CALL, PURCHASE, EMAIL]": "conversion_points",
  "[TOPICS YOU CANNOT COVER, COMPLIANCE LIMITS, BRAND VOICE NOTES]": "constraints",
  "[PASTE THE ROW FROM THE PROMPT 2 CLUSTER MAP: URL, PAGE TYPE, CANONICAL QUERY, SUPPORTING QUERIES, INTENT, JOB]":
    "page_row",
  "[AUTHOR NAME, ROLE, AND WHY THEY ARE CREDIBLE ON THIS TOPIC]": "author",
  "[PASTE ORIGINAL DATA, CUSTOMER RESULTS, INTERNAL PROCESSES, TESTS YOU HAVE RUN, OR OPINIONS YOU HOLD THAT THE COMPETITION DOES NOT]":
    "proprietary_material",
  "[THREE ADJECTIVES AND ONE PARAGRAPH SAMPLE OF YOUR WRITING]": "voice",
  "[WHAT THE READER SHOULD DO AND THE EXACT LINK]": "conversion_link",
  "[PASTE THE TITLES AND URLS OF THE CURRENT TOP 5, OR TELL ME TO RETRIEVE THEM IF I HAVE WEB SEARCH]":
    "current_top_results",
  "[PLATFORM OR CMS, HOSTING, WHETHER IT IS JAVASCRIPT-RENDERED]": "platform",
  "[PASTE OR SUMMARIZE A CRAWL EXPORT WITH STATUS CODES, TITLES, CANONICALS, INDEXABILITY, CRAWL DEPTH, AND INLINKS FROM SCREAMING FROG, SITEBULB, OR SIMILAR; OR PASTE YOUR SITEMAP AND I WILL WORK FROM THAT]":
    "crawl_export",
  "[PASTE THE PAGE INDEXING REPORT SUMMARY AND THE TOP 200 PAGES BY IMPRESSIONS WITH CLICKS, CTR, AND POSITION]":
    "gsc_pages",
  "[PASTE PAGESPEED INSIGHTS OR CRUX NUMBERS FOR YOUR HOMEPAGE, ONE MONEY PAGE, AND ONE CONTENT PAGE: LCP, INP, CLS]":
    "pagespeed",
  "[PASTE IT]": "robots_txt",
  "[TOP 20 ORGANIC LANDING PAGES BY SESSIONS WITH CONVERSION RATE, IF YOU HAVE IT]": "analytics",
  "[PASTE THE CLUSTER MAP SO THE LIVE SITE CAN BE CHECKED AGAINST THE PLAN]": "p2_cluster_map",
  "[NAME, TITLE, CREDENTIALS, AND ANYTHING NOTABLE THEY HAVE DONE]": "spokesperson",
  "[LIST CURRENT PROFILES: LINKEDIN, CRUNCHBASE, G2, CAPTERRA, TRUSTPILOT, GOOGLE BUSINESS PROFILE, WIKIDATA, YOUTUBE, X, REDDIT, OTHERS]":
    "existing_profiles",
  "[ORIGINAL DATA, CUSTOMER COUNTS, CASE STUDY RESULTS, TOOLS, TEMPLATES, RESEARCH, OR STRONG OPINIONS YOU CAN PUBLISH]":
    "assets",
  "[PASTE THE LIST]": "p1_gatekeepers",
  "[PASTE THE LISTS FROM EVERY PAGE BUILT SO FAR]": "p3_corroboration",
  "[MONTHLY BUDGET FOR PR, OUTREACH, AND CONTENT, PLUS HOURS PER WEEK]": "budget_time",
  "[REFERRING DOMAIN COUNT, TOP 20 LINKING DOMAINS, TOP LINKED PAGES, IF YOU HAVE THEM]":
    "backlinks",
};

/**
 * Brackets that are writing patterns inside the prompt ("[COMPETITOR] vs",
 * "[Term] is [category]"), not variables. Left exactly as written.
 */
export const PATTERN_TOKENS = new Set([
  "[COMPETITOR]",
  "[category]",
  "[use case]",
  "[Term]",
  "[distinguishing function]",
]);

export type PromptDef = {
  id: PromptId;
  number: number;
  name: string;
  /** "What it does" from the doc. */
  summary: string;
  /** When to run it; drives the overview's recommendations. */
  cadence: string;
  text: string;
  /** OUTPUT FORMAT items, one step each, in order. */
  sections: { name: string; spec: string }[];
  /** Earlier prompts that must have an approved run first. */
  requires: PromptId[];
};

export const PROMPTS: Record<PromptId, PromptDef> = {
  p1: {
    id: "p1",
    number: 1,
    name: "Demand Cartography",
    summary:
      "Maps every way demand for what you sell shows up in Google and in AI answers, then tells you which queries still send clicks and which ones AI has already eaten.",
    cadence: "Once at setup. Re-run when the offer, market or competitors change, or yearly.",
    text: p1,
    sections: [
      { name: "Demand Origin Map", spec: "table of situation × journey stage × exact language." },
      {
        name: "Keyword Universe",
        spec: "table with query, intent, AI-answerability class, volume tier (high/medium/low with reasoning), business value, composite score.",
      },
      {
        name: "SERP and AI-Source Landscape",
        spec: "for the top 20 queries, with the citation gatekeepers list.",
      },
      {
        name: "The Ten Battles",
        spec: "the 10 query clusters to fight for first, one paragraph of rationale each.",
      },
      {
        name: "Assumptions Log",
        spec: "every assumption you made about volumes, competitors, or authority, so I can correct them.",
      },
    ],
    requires: [],
  },
  p2: {
    id: "p2",
    number: 2,
    name: "Topical Sovereignty Blueprint",
    summary:
      "Turns the demand map into a site architecture. Every page, its job, its URL, its internal links, and the order to build it.",
    cadence: "After Prompt 1 is approved. Re-run whenever Prompt 1 is re-run.",
    text: p2,
    sections: [
      { name: "Topic Boundary Statement", spec: "" },
      {
        name: "Cluster Map",
        spec: "one row per page with URL, page type, canonical query, supporting queries, intent, journey stage, job of the page, conversion point.",
      },
      { name: "Internal Link Map", spec: "" },
      { name: "Navigation and Folder Plan", spec: "" },
      { name: "Structural Spec per page type", spec: "" },
      { name: "12-Month Build Calendar", spec: "with New/Rewrite/Merge/Redirect flags." },
      { name: "Cannibalization Report", spec: "" },
    ],
    requires: ["p1"],
  },
  p3: {
    id: "p3",
    number: 3,
    name: "Dual-Citation Content Forge",
    summary:
      "Builds one page at a time, engineered to rank in Google and to be the exact passage ChatGPT, Perplexity, and AI Overviews quote.",
    cadence: "Once per page, following the build calendar (pages per month from the intake).",
    text: p3,
    sections: [
      { name: "Fan-out outline", spec: "" },
      { name: "Information Gain Audit", spec: "table." },
      { name: "Full draft", spec: "with headings." },
      { name: "On-page package", spec: "with JSON-LD in a code block." },
      { name: "Citation Sheet", spec: "" },
      { name: "Corroboration targets", spec: "" },
      { name: "Anything you need from me before this can publish", spec: "" },
    ],
    requires: ["p1", "p2"],
  },
  p4: {
    id: "p4",
    number: 4,
    name: "Crawl-to-Citation Diagnostic",
    summary:
      "A full technical and on-page audit built from your own exports, ranked by impact, including whether AI crawlers can reach you at all.",
    cadence: "Quarterly.",
    text: p4,
    sections: [
      {
        name: "Executive Diagnosis",
        spec: "the five issues costing the most, in plain language, with the share of the site's organic potential each one is blocking.",
      },
      {
        name: "Findings Register",
        spec: "table with issue, affected URLs (count plus examples), mechanism of harm, severity 1 to 5, effort 1 to 5, fix, owner (developer, content, SEO).",
      },
      { name: "AI Crawler Access Report", spec: "with the recommended robots.txt." },
      { name: "Core Web Vitals plan", spec: "" },
      {
        name: "Title and Description Rewrite Sheet",
        spec: "for the CTR opportunities: old, new, reason.",
      },
      { name: "Decay and Cannibalization Actions", spec: "" },
      { name: "Striking Distance List", spec: "" },
      {
        name: "30-Day Sprint",
        spec: "the fixes to ship first, in order, with what to verify after each.",
      },
    ],
    requires: [],
  },
  p5: {
    id: "p5",
    number: 5,
    name: "Authority Gravity Engine",
    summary:
      "Builds the off-site half: entity consistency, the sources AI engines pull from, linkable assets, digital PR, reviews, community, and a monthly AI-visibility test.",
    cadence:
      "After Prompt 1 is approved and a few pages are built. Re-run quarterly; the AI-visibility test runs monthly.",
    text: p5,
    sections: [
      { name: "Canonical Entity Sheet", spec: "and profile-consistency checklist." },
      {
        name: "Citation-Source Action Plan",
        spec: "table with source, the engines it feeds, how inclusion is earned, action, owner, prerequisite.",
      },
      { name: "Linkable Asset Briefs", spec: "" },
      { name: "Outreach Playbook", spec: "with templates." },
      { name: "Review and Community Plan", spec: "" },
      { name: "Scorecard and the AI Visibility Prompt Set", spec: "" },
      {
        name: "90-Day Plan",
        spec: "week by week, the single most important action each week and the metric it should move.",
      },
    ],
    requires: ["p1"],
  },
};

/** Variables a prompt uses, in first-appearance order. */
export function promptVariables(id: PromptId): VariableDef[] {
  const text = PROMPTS[id].text;
  const seen = new Set<string>();
  const out: VariableDef[] = [];
  for (const match of text.matchAll(/\[[^\]]+\]/g)) {
    const mapped = TOKEN_MAP[match[0]];
    if (!mapped) continue;
    const key = mapped.split(".")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(VARIABLES[key]);
  }
  return out;
}
