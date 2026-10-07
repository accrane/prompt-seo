// Verifies every [BRACKET] in the five prompt texts is either mapped to a
// variable or listed as a writing pattern, so an edit to the doc text can't
// silently leave a placeholder unfilled. Run: pnpm check:prompts
import { PATTERN_TOKENS, PROMPT_IDS, PROMPTS, TOKEN_MAP, VARIABLES } from "@/lib/prompts/registry";

let failed = false;
for (const id of PROMPT_IDS) {
  for (const match of PROMPTS[id].text.matchAll(/\[[^\]]+\]/g)) {
    const token = match[0];
    if (PATTERN_TOKENS.has(token)) continue;
    const mapped = TOKEN_MAP[token];
    if (!mapped) {
      console.error(`${id}: unmapped token ${token}`);
      failed = true;
    } else if (!VARIABLES[mapped.split(".")[0]]) {
      console.error(`${id}: ${token} maps to unknown variable ${mapped}`);
      failed = true;
    }
  }
}
for (const [token, key] of Object.entries(TOKEN_MAP)) {
  if (!PROMPT_IDS.some((id) => PROMPTS[id].text.includes(token))) {
    console.error(`TOKEN_MAP entry never used: ${token} → ${key}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("All prompt placeholders are mapped.");
