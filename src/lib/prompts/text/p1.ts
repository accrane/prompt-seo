// Verbatim from the SEO prompt system doc. Do not edit the wording; variables
// are substituted at run time by src/lib/prompts/render.ts.
const text = `You are operating as the head of search strategy for [YOUR BUSINESS NAME]. Your job in this session is to produce a complete map of how demand for [YOUR PRIMARY PRODUCT/SERVICE] expresses itself across Google and across AI answer engines (Google AI Overviews and AI Mode, ChatGPT, Perplexity, Gemini). Nothing you produce should be generic. Every line must be specific to this business.
VARIABLES
Business: [YOUR BUSINESS NAME]: [ONE PARAGRAPH ON WHAT YOU SELL AND TO WHOM]
Website: [YOUR WEBSITE URL]
Primary offer: [YOUR PRIMARY PRODUCT/SERVICE]
Ideal customer: [WHO BUYS, THEIR ROLE OR SITUATION, WHAT TRIGGERS THE PURCHASE]
Geography: [GLOBAL / COUNTRY / CITY]
Price point and sales cycle: [E.G. $49/MONTH SELF-SERVE, OR $20K ENTERPRISE WITH A 3-MONTH CYCLE]
Competitors: [COMPETITOR 1], [COMPETITOR 2], [COMPETITOR 3]
Existing data: [PASTE YOUR SEARCH CONSOLE QUERY EXPORT FOR THE LAST 12 MONTHS, OR WRITE "NONE"]
PHASE 1: DEMAND ORIGIN MODELING
Before listing a single keyword, reconstruct the customer's journey backwards from the purchase. Identify the 5 to 8 distinct situations that cause someone to start looking for [YOUR PRIMARY PRODUCT/SERVICE]. For each situation, write the actual language a person uses at three moments: when they first notice the problem and don't know the category exists, when they are comparing options and know the category, and when they are ready to choose and know the players. This is the seed set. Everything else derives from it.
PHASE 2: KEYWORD UNIVERSE CONSTRUCTION
Expand the seed set into a universe of at least 150 queries. Include head terms, long-tail modifiers, question forms (how, what, why, can, should, vs), comparison forms ([COMPETITOR] vs, alternatives to, [COMPETITOR] pricing), "best [category] for [use case]" forms, jobs-to-be-done phrasings that contain no category name at all, and conversational forms exactly as someone would type them into ChatGPT: full sentences, first person, with context. If you have web search, retrieve the live top 10 for the 15 highest-priority terms and record what type of page ranks (guide, listicle, tool, product page, forum thread, video).
PHASE 3: INTENT AND CLICK-POTENTIAL CLASSIFICATION
Classify every query on two axes.
Axis 1, intent: Informational, Commercial investigation, Transactional, Navigational, Local.
Axis 2, AI answerability: (A) fully answerable by an AI Overview, no click needed; (B) partially answerable, the AI gives a summary but the user still needs depth, a tool, a price, or a person; (C) not answerable, requires a transaction, a login, a quote, a download, or a human.
Class A click value is collapsing. Classes B and C are where organic traffic still converts. Flag B and C as priority.
PHASE 4: SERP AND AI-SOURCE LANDSCAPE
For the 20 most valuable queries, identify which domains dominate, which content formats win, whether an AI Overview appears (if you can check), and which sources AI engines are most likely citing for this topic: industry publications, listicle sites, Reddit threads, review platforms, vendor pages, YouTube. Name the "citation gatekeepers": the third-party pages AI engines repeatedly pull from for this category. These become targets in a later prompt.
PHASE 5: OPPORTUNITY SCORING
Score every query 1 to 10 on business value (proximity to revenue), click potential (from Phase 3), attainability for a site with [YOUR WEBSITE URL]'s current authority (state your assumption), and content-gap size (how weak the current top results are). Multiply for a composite score. Sort descending.
OUTPUT FORMAT
Demand Origin Map: table of situation × journey stage × exact language.
Keyword Universe: table with query, intent, AI-answerability class, volume tier (high/medium/low with reasoning), business value, composite score.
SERP and AI-Source Landscape for the top 20 queries, with the citation gatekeepers list.
The Ten Battles: the 10 query clusters to fight for first, one paragraph of rationale each.
Assumptions Log: every assumption you made about volumes, competitors, or authority, so I can correct them.
RULES
Do not invent search volumes. Use tiers with reasoning.
Do not pad the universe with near-duplicates. Cluster variants under one canonical query.
If any variable is missing, ask before starting.
Weight the questions a buyer asks an AI in a full sentence. Those queries are underserved by everyone still optimizing for two-word head terms.
`;
export default text;
