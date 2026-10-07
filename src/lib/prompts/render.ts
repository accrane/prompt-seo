import {
  PATTERN_TOKENS,
  PROMPTS,
  TOKEN_MAP,
  VARIABLES,
  promptVariables,
  type PromptId,
} from "@/lib/prompts/registry";

/** Resolved values for one run, keyed by variable. Competitors is a list. */
export type InputValues = Record<string, string | string[]>;

export type ResolvedInput = {
  key: string;
  label: string;
  source: string;
  /** Value that will be sent, after fallbacks. Null when missing. */
  value: string | null;
  usedFallback: boolean;
};

/** Applies fallbacks and reports which required variables are still missing. */
export function resolveInputs(prompt: PromptId, raw: InputValues) {
  const inputs: ResolvedInput[] = [];
  const missing: string[] = [];

  for (const def of promptVariables(prompt)) {
    const rawValue = raw[def.key];
    if (def.key === "competitors") {
      const list = (Array.isArray(rawValue) ? rawValue : splitList(rawValue ?? ""))
        .map((c) => c.trim())
        .filter(Boolean);
      if (!list.length) missing.push(def.label);
      inputs.push({
        key: def.key,
        label: def.label,
        source: def.source,
        value: list.length ? list.join("\n") : null,
        usedFallback: false,
      });
      continue;
    }
    const text = typeof rawValue === "string" ? rawValue.trim() : "";
    if (text) {
      inputs.push({
        key: def.key,
        label: def.label,
        source: def.source,
        value: text,
        usedFallback: false,
      });
    } else if (def.fallback !== undefined) {
      inputs.push({
        key: def.key,
        label: def.label,
        source: def.source,
        value: def.fallback,
        usedFallback: true,
      });
    } else {
      missing.push(def.label);
      inputs.push({
        key: def.key,
        label: def.label,
        source: def.source,
        value: null,
        usedFallback: false,
      });
    }
  }

  return { inputs, missing };
}

export function splitList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Fills the doc's prompt text. Single-line values replace the bracket inline;
 * pasted exports and earlier outputs are wrapped in tags on their own lines
 * so Claude can tell where a 400-row export ends and the prompt resumes.
 */
export function renderPrompt(prompt: PromptId, inputs: ResolvedInput[]): string {
  const byKey = new Map(inputs.map((i) => [i.key, i.value ?? ""]));

  return PROMPTS[prompt].text.replace(/\[[^\]]+\]/g, (token) => {
    if (PATTERN_TOKENS.has(token)) return token;
    const mapped = TOKEN_MAP[token];
    if (!mapped) return token;

    const [key, slot] = mapped.split(".");
    if (key === "competitors") {
      const list = splitList(byKey.get("competitors") ?? "");
      return list[Number(slot)] ?? "(none named)";
    }

    const value = byKey.get(key) ?? "";
    const def = VARIABLES[key];
    const block = value.includes("\n") || def.source === "data" || def.source === "output";
    return block && value.length > 40 ? `\n<${key}>\n${value}\n</${key}>\n` : value;
  });
}

/**
 * System prompt for every run. The doc's prompts assume a person pasting
 * them into a chat; this tells Claude how the app runs them instead.
 */
export const RUN_SYSTEM_PROMPT = `You are running inside Prompt SEO, an internal tool at Bellaworks Web Design (a WordPress agency) that runs a five-prompt SEO system for client sites. The operator filled in the prompt's variables from an intake form, and outputs from earlier prompts in the system are chained in where the prompt asks for them.

How this run works:
- The app asks for the prompt's OUTPUT FORMAT one section per turn, so each reply stays a manageable length. Do the analysis phases that feed a section before writing it, and carry your earlier work forward: later sections must agree with earlier ones.
- Reply with only the requested section, in GitHub-flavored Markdown, starting with a level-2 heading that is exactly the section name. No preamble, no closing remarks, and do not repeat earlier sections.
- Use Markdown tables wherever the section calls for a table. Keep each table cell to plain text on one line.
- The operator cannot answer questions mid-run. Where the prompt says to ask before starting, make the most reasonable assumption instead, flag it inline as "Assumption:", and include it in the section meant for assumptions or open items. A variable reading "NONE", "NOT PROVIDED" or similar means the operator does not have that data.
- You have web search. Use it where a phase asks you to check live results, rankings, AI Overviews, or third-party sources. Cite what you find with URLs.`;

export function sectionInstruction(prompt: PromptId, index: number): string {
  const sections = PROMPTS[prompt].sections;
  const section = sections[index];
  const spec = section.spec ? ` (${section.spec.replace(/\.$/, "")})` : "";
  const position = `Section ${index + 1} of ${sections.length}`;
  if (index === 0) {
    return `${position}: produce "${section.name}"${spec}. Start your reply with "## ${section.name}".`;
  }
  return `Next, ${position.toLowerCase()}: produce "${section.name}"${spec}. Start your reply with "## ${section.name}".`;
}
