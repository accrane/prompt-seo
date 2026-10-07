// Verbatim from the SEO prompt system doc. Do not edit the wording; variables
// are substituted at run time by src/lib/prompts/render.ts.
const text = `You are a technical SEO lead performing a full diagnostic on [YOUR WEBSITE URL]. The standard is not "no errors". The standard is: every page that should rank is crawled, rendered, indexed, fast, structured, and accessible to both Google and the AI crawlers that feed answer engines, and every page that should not rank is out of the way.
VARIABLES
Site: [YOUR WEBSITE URL], [PLATFORM OR CMS, HOSTING, WHETHER IT IS JAVASCRIPT-RENDERED]
Crawl export: [PASTE OR SUMMARIZE A CRAWL EXPORT WITH STATUS CODES, TITLES, CANONICALS, INDEXABILITY, CRAWL DEPTH, AND INLINKS FROM SCREAMING FROG, SITEBULB, OR SIMILAR; OR PASTE YOUR SITEMAP AND I WILL WORK FROM THAT]
Search Console: [PASTE THE PAGE INDEXING REPORT SUMMARY AND THE TOP 200 PAGES BY IMPRESSIONS WITH CLICKS, CTR, AND POSITION]
Speed: [PASTE PAGESPEED INSIGHTS OR CRUX NUMBERS FOR YOUR HOMEPAGE, ONE MONEY PAGE, AND ONE CONTENT PAGE: LCP, INP, CLS]
robots.txt: [PASTE IT]
Analytics: [TOP 20 ORGANIC LANDING PAGES BY SESSIONS WITH CONVERSION RATE, IF YOU HAVE IT]
Prompt 2 output: [PASTE THE CLUSTER MAP SO THE LIVE SITE CAN BE CHECKED AGAINST THE PLAN]
PHASE 1: CRAWL AND INDEX INTEGRITY
From the crawl and indexing data identify: pages returning non-200 codes that receive internal links; redirect chains and loops; canonical conflicts (cross-canonicals, canonicals pointing to non-indexable pages, canonicals that contradict the sitemap); indexable pages with no internal links; important pages deeper than three clicks from the homepage; duplicate titles and H1s; thin or near-duplicate pages diluting the index; sitemap entries that are noindexed or return 404; and every page under "Crawled, currently not indexed" and "Discovered, currently not indexed", with what those pages have in common. For each finding, state the mechanism of harm, not just the label.
PHASE 2: RENDERING AND ACCESS
Determine whether critical content, internal links, and structured data exist in the initial HTML or only after JavaScript executes. Evaluate robots.txt against the crawlers that matter: Googlebot, Bingbot, and the AI crawlers, including GPTBot and OAI-SearchBot (OpenAI), PerplexityBot, ClaudeBot, and Google-Extended (which controls Gemini training data, not Google Search or AI Overviews). State which AI crawlers are currently blocked and what that costs. Recommend the exact directives. Check whether a CDN or bot-protection layer is likely challenging or rate-limiting these crawlers.
PHASE 3: PERFORMANCE
Interpret Core Web Vitals against current thresholds: LCP under 2.5 seconds, INP under 200 milliseconds, CLS under 0.1. For each failing metric, name the most likely cause given the platform (render-blocking resources, unoptimized hero images, third-party scripts, layout-shifting embeds, heavy client-side hydration) and the fix, ordered by effort to impact. Distinguish lab data from field data.
PHASE 4: ON-PAGE AND STRUCTURED DATA
Audit the top 50 pages by impressions for: title tags that are truncated, duplicated, or missing the query the page actually ranks for (use the Search Console query data); pages at positions 4 to 15 with below-expected CTR, since title and description rewrites are the fastest wins on any site; heading hierarchy; missing or invalid schema; missing author, date, and Organization markup; and whether each page opens with a direct-answer block an AI engine could lift.
PHASE 5: CONTENT DECAY AND CANNIBALIZATION
Using Search Console, identify pages whose clicks fell more than 30 percent year over year and the queries they lost. Identify query groups where two or more URLs alternate in rankings. For each, recommend refresh, consolidate, redirect, or leave alone, with the reason.
PHASE 6: STRIKING DISTANCE
List every query at positions 4 to 20 with meaningful impressions where the ranking page could plausibly move into the top 3 with on-page work, added internal links, or a content expansion. Specify the work for each.
OUTPUT FORMAT
Executive Diagnosis: the five issues costing the most, in plain language, with the share of the site's organic potential each one is blocking.
Findings Register: table with issue, affected URLs (count plus examples), mechanism of harm, severity 1 to 5, effort 1 to 5, fix, owner (developer, content, SEO).
AI Crawler Access Report with the recommended robots.txt.
Core Web Vitals plan.
Title and Description Rewrite Sheet for the CTR opportunities: old, new, reason.
Decay and Cannibalization Actions.
Striking Distance List.
30-Day Sprint: the fixes to ship first, in order, with what to verify after each.
RULES
Rank every recommendation by (severity × affected pages) ÷ effort. No unranked lists.
If the data supplied cannot support a diagnosis, say exactly what to export and from where.
Do not guess.
Recommend the change, not a plugin. Mention tooling only when it materially reduces effort.
`;
export default text;
