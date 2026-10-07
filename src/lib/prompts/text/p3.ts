// Verbatim from the SEO prompt system doc. Do not edit the wording; variables
// are substituted at run time by src/lib/prompts/render.ts.
const text = `You are writing one page from the architecture below. The page has two jobs at once: rank in Google's classic results for its cluster, and be the source an AI engine quotes when someone asks the questions this page answers. Those are different tests. A page passes the first with depth, relevance, and authority signals. It passes the second with clarity, extractability, and claims specific enough to be worth repeating. Build for both.
VARIABLES
Page to build: [PASTE THE ROW FROM THE PROMPT 2 CLUSTER MAP: URL, PAGE TYPE, CANONICAL QUERY, SUPPORTING QUERIES, INTENT, JOB]
Brand: [YOUR BUSINESS NAME], [YOUR WEBSITE URL]
Author: [AUTHOR NAME, ROLE, AND WHY THEY ARE CREDIBLE ON THIS TOPIC]
Proprietary material: [PASTE ORIGINAL DATA, CUSTOMER RESULTS, INTERNAL PROCESSES, TESTS YOU HAVE RUN, OR OPINIONS YOU HOLD THAT THE COMPETITION DOES NOT]
Voice: [THREE ADJECTIVES AND ONE PARAGRAPH SAMPLE OF YOUR WRITING]
Conversion: [WHAT THE READER SHOULD DO AND THE EXACT LINK]
Current top results: [PASTE THE TITLES AND URLS OF THE CURRENT TOP 5, OR TELL ME TO RETRIEVE THEM IF I HAVE WEB SEARCH]
PHASE 1: QUERY FAN-OUT RECONSTRUCTION
List every sub-question an AI engine would generate when a user asks the canonical query: the "what is", "how does", "how much", "which is better", "what are the risks", "what do experts say", and "what changed recently" branches. The page answers each one in a dedicated, findable section. This list becomes the H2 and H3 outline.
PHASE 2: INFORMATION GAIN AUDIT
Compare the outline against the current top results. Identify what all of them say (table stakes, cover it briefly), what none of them say (the gap, cover it deeply), and what they get wrong or leave vague. Insert the proprietary material wherever it creates a claim no competitor can make. If no proprietary material was supplied, tell me the three things I should go get before publishing (a test, a dataset, a customer number, an expert quote) and draft with placeholders.
PHASE 3: THE DRAFT
Write the full page.
Opening: the direct answer to the canonical query in 40 to 60 words, stated as a complete, self-contained claim that could be quoted without the surrounding text. Name the entity, not a pronoun.
Every H2 is phrased as the question it answers. The first sentence under it is the answer. Evidence follows.
Definitions use the pattern "[Term] is [category] that [distinguishing function]".
Include at least one comparison table, one numbered process, and one concrete example with real numbers.
Every statistic has a source and a year. Every recommendation has a condition ("do X when Y").
The author's first-hand experience appears in first person at least three times, tied to specifics.
Word count is whatever the fan-out list requires. Do not pad. Do not truncate.
Close with a section titled with the natural next question a reader has, and link to the conversion point with an anchor that describes the offer.
PHASE 4: ON-PAGE PACKAGE
Deliver the title tag (under 60 characters, canonical query near the front, a reason to click), meta description (under 155 characters, states the outcome), H1, URL slug, image alt-text list, internal links to add from the Prompt 2 link map, external citations list, and the JSON-LD: Article with author and dateModified, Organization with sameAs, FAQPage for the question sections, and Product or Service schema if it applies.
PHASE 5: AI EXTRACTABILITY PASS
Re-read the draft as an AI engine assembling an answer. Mark every passage that could be lifted verbatim as a complete answer. If any H2 section lacks one, rewrite its opening. Produce the Citation Sheet: the 8 to 12 sentences on this page most likely to be quoted by an AI, each with the question it answers. Then list the third-party places this page's core claims should also appear, in consistent wording, so AI engines see corroboration. This feeds Prompt 5.
PHASE 6: QUALITY GATE
Before returning, check: would an expert in this field find anything wrong? Is there a paragraph that exists only to add length? Does any sentence begin with "In today's" or "In the world of" or contain "it's important to note"? Does every claim survive the question "compared to what?" Fix, then return.
OUTPUT FORMAT
Fan-out outline.
Information Gain Audit table.
Full draft with headings.
On-page package with JSON-LD in a code block.
Citation Sheet.
Corroboration targets.
Anything you need from me before this can publish.
RULES
Never fabricate a statistic, quote, customer, or result. Use a placeholder and flag it.
Do not write for a general audience. Write for the ideal customer defined in Prompt 1.
Prefer the specific over the impressive.
`;
export default text;
