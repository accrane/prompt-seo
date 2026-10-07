import "server-only";

const TIMEOUT_MS = 15_000;
const MAX_SITEMAPS = 25;
const MAX_URLS = 3000;

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "PromptSEO/1.0 (+Bellaworks)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function origin(siteUrl: string): string {
  return new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`).origin;
}

export async function fetchRobots(siteUrl: string): Promise<string | null> {
  return get(`${origin(siteUrl)}/robots.txt`);
}

/**
 * Collects page URLs from the site's sitemap(s): robots.txt Sitemap lines
 * first, then the usual WordPress / Yoast / Rank Math locations. Follows
 * sitemap indexes one level at a time up to a cap.
 */
export async function fetchSitemapUrls(
  siteUrl: string,
): Promise<{ urls: string[]; sitemaps: string[] }> {
  const base = origin(siteUrl);
  const robots = (await get(`${base}/robots.txt`)) ?? "";
  const queue = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!queue.length) {
    // Nothing declared: use the first usual location that answers.
    for (const guess of [
      `${base}/sitemap_index.xml`,
      `${base}/wp-sitemap.xml`,
      `${base}/sitemap.xml`,
    ]) {
      if ((await get(guess))?.includes("<loc>")) {
        queue.push(guess);
        break;
      }
    }
  }

  const seen = new Set<string>();
  const urls = new Set<string>();
  const used: string[] = [];

  while (queue.length && seen.size < MAX_SITEMAPS && urls.size < MAX_URLS) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    const xml = await get(next);
    if (!xml || !xml.includes("<loc>")) continue;
    used.push(next);
    const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/g)].map((m) =>
      m[1].replace(/&amp;/g, "&"),
    );
    if (/<sitemapindex/i.test(xml)) {
      queue.push(...locs);
    } else {
      for (const loc of locs) {
        if (urls.size >= MAX_URLS) break;
        urls.add(loc);
      }
    }
  }

  return { urls: [...urls], sitemaps: used };
}
