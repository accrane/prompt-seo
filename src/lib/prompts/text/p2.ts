// Verbatim from the SEO prompt system doc. Do not edit the wording; variables
// are substituted at run time by src/lib/prompts/render.ts.
const text = `You are the information architect for [YOUR WEBSITE URL]. Using the demand map below, design the complete content architecture that would make this site the most complete source on [CORE TOPIC] for [GEOGRAPHY]: complete enough that a search engine treats it as topically authoritative, and an AI engine treats it as a source it can cite without hedging.
VARIABLES
Prompt 1 output: [PASTE THE FULL OUTPUT OF PROMPT 1]
Core topic: [THE ONE TOPIC YOU WANT TO OWN]
Current site: [PASTE YOUR SITEMAP OR A LIST OF EXISTING URLS WITH TITLES, OR WRITE "NEW SITE"]
Content capacity: [NUMBER OF PAGES YOU CAN PUBLISH PER MONTH]
Conversion points: [WHAT YOU WANT VISITORS TO DO: DEMO, TRIAL, CALL, PURCHASE, EMAIL]
Constraints: [TOPICS YOU CANNOT COVER, COMPLIANCE LIMITS, BRAND VOICE NOTES]
PHASE 1: TOPIC BOUNDARY DEFINITION
Define the boundary of topical authority. List the sub-topics a site must cover to be considered complete on [CORE TOPIC], the adjacent topics that look related but would dilute authority, and the bridge topics that connect the core to the money pages. Write the boundary as one paragraph a writer can use to reject off-topic ideas.
PHASE 2: CLUSTER DESIGN
Group the keyword universe into clusters using SERP-overlap logic: two queries belong on the same page if the same pages would rank for both, and on different pages if the top results differ. For each cluster assign the canonical query, the supporting queries, the page type (pillar guide, cluster article, comparison page, tool or template page, glossary entry, product or service page, case study, FAQ hub), the target intent, and the page's job in the buyer journey. Every cluster maps to exactly one URL. Flag any existing URLs that currently compete for the same cluster and specify merge, redirect, or differentiate.
PHASE 3: HUB-AND-SPOKE LINKING SCHEMA
For every pillar, define its spokes. Set the internal linking rules: each spoke links up to its pillar with a descriptive anchor containing the pillar's canonical query; each pillar links down to every spoke in a structured section; spokes cross-link only when the relationship is real; money pages receive links from every relevant cluster with an anchor that describes the offer, never "click here" or "learn more". Produce the link map as a table: source URL, destination URL, anchor text, placement (body, related section, navigation).
PHASE 4: URL AND NAVIGATION STRUCTURE
Propose the folder structure (for example /guides/, /compare/, /tools/, /glossary/) and the URL for every planned page: lowercase, hyphenated, built on the canonical query, no dates, no filler words. Recommend what goes in primary navigation, what lives in a resources hub, and which pages stay reachable through contextual links only. No orphans.
PHASE 5: AI-ENGINE STRUCTURAL REQUIREMENTS
For each page type, specify the structural elements that make the page extractable by AI engines: a direct-answer block at the top; question-form H2s that mirror the sub-queries an AI Mode fan-out would generate; definition sentences that name the entity explicitly; comparison tables; a visible "last updated" date; author attribution with credentials; and the schema types to use (Article, Organization with sameAs, Product or Service, BreadcrumbList, FAQPage where question sections exist).
PHASE 6: BUILD ORDER
Sequence every page across 12 months at [NUMBER OF PAGES PER MONTH]. Order: money pages first, then the pillars that support them, then the spokes with the highest composite score from Prompt 1, then everything else. Front-load the pages that fill the largest content gaps. Mark each page New, Rewrite, Merge, or Redirect.
OUTPUT FORMAT
Topic Boundary Statement.
Cluster Map: one row per page with URL, page type, canonical query, supporting queries, intent, journey stage, job of the page, conversion point.
Internal Link Map.
Navigation and Folder Plan.
Structural Spec per page type.
12-Month Build Calendar with New/Rewrite/Merge/Redirect flags.
Cannibalization Report.
RULES
No page without a distinct job. If two pages have the same job, merge them.
Do not propose a page you cannot describe in one sentence with a specific reader in mind.
Every money page has at least five supporting pages linking to it in the plan.
If existing pages fall outside the boundary, recommend prune, consolidate, or noindex. Do not ignore them.
`;
export default text;
