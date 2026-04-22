export interface ParsedArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  imageUrl: string | null;
}

// Default keywords (fallback when DB table is empty)
export const MATCH_KEYWORDS = [
  'armored vehicle',
  'armoured vehicle',
  'armored vehicles',
  'armoured vehicles',
  'run flat',
  'run-flat',
  'runflat',
  'run flats',
  'tires',
  'tire',
  'tyres',
  'tyre',
];

// Default RSS sources (fallback when DB table is empty)
export const RSS_SOURCES = [
  { name: 'Defense News',              url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml' },
  { name: 'Breaking Defense',          url: 'https://breakingdefense.com/feed/' },
  { name: 'Army Technology',           url: 'https://www.army-technology.com/feed/' },
  { name: 'C4ISRNET',                  url: 'https://www.c4isrnet.com/arc/outboundfeeds/rss/' },
  { name: 'National Defense Magazine', url: 'https://www.nationaldefensemagazine.org/rss/articles.xml' },
  { name: 'The Defense Post',          url: 'https://thedefensepost.com/feed/' },
  { name: 'Military.com News',         url: 'https://www.military.com/rss-feeds/content?channel=news' },
  { name: 'Defense One',               url: 'https://www.defenseone.com/rss/all/' },
];

// ─── XML helpers ──────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'is');
  return (xml.match(re)?.[1] ?? '').trim();
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  return xml.match(re)?.[1] ?? null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImageFromDescription(desc: string): string | null {
  return desc.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

// ─── RSS Parser ───────────────────────────────────────────────────────────────

export function parseRSSXML(xml: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const isAtom = xml.includes('<feed') && xml.includes('<entry');
  const itemTag = isAtom ? 'entry' : 'item';
  const itemRe = new RegExp(`<${itemTag}[\\s>]([\\s\\S]*?)<\\/${itemTag}>`, 'gi');

  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const item = match[1];
    const title = stripHtml(extractTag(item, 'title'));
    if (!title) continue;

    const rawDesc = extractTag(item, 'description') || extractTag(item, 'summary') || extractTag(item, 'content');
    const description = stripHtml(rawDesc).slice(0, 400);

    let url =
      extractTag(item, 'link') ||
      extractAttr(item, 'link', 'href') ||
      extractTag(item, 'guid') ||
      '';
    url = url.trim();
    if (!url || !url.startsWith('http')) continue;

    const pubDateRaw = extractTag(item, 'pubDate') || extractTag(item, 'published') || extractTag(item, 'updated');
    let publishedAt = new Date().toISOString();
    if (pubDateRaw) {
      try { publishedAt = new Date(pubDateRaw).toISOString(); } catch { /* keep now */ }
    }

    const imageUrl =
      extractAttr(item, 'media:content', 'url') ||
      extractAttr(item, 'media:thumbnail', 'url') ||
      extractAttr(item, 'enclosure', 'url') ||
      extractImageFromDescription(rawDesc) ||
      null;

    articles.push({ title, description, url, publishedAt, imageUrl });
  }

  return articles;
}

// ─── Keyword matching (word-boundary aware) ───────────────────────────────────

/**
 * Checks if a keyword appears as a whole word in the haystack.
 * Prevents "tire" from matching "retire", "entire", "attire".
 * Handles multi-word / hyphenated keywords (e.g. "run-flat").
 */
function matchesKeyword(haystack: string, kw: string): boolean {
  const escaped = kw
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
    .replace(/[\s-]+/g, '[\\s-]+');           // flexible space/hyphen between words
  return new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i').test(haystack);
}

/**
 * Returns matched keywords from title + description.
 * Pass a custom `keywords` array (from DB) or falls back to MATCH_KEYWORDS.
 */
export function matchKeywords(
  title: string,
  description: string,
  keywords: string[] = MATCH_KEYWORDS,
): string[] {
  const haystack = `${title} ${description}`;
  return keywords.filter((kw) => matchesKeyword(haystack, kw));
}

// ─── Fetch + parse one RSS source ────────────────────────────────────────────

export async function fetchSource(
  source: { name: string; url: string },
  keywords: string[] = MATCH_KEYWORDS,
): Promise<Array<ParsedArticle & { sourceName: string; keywords: string[] }>> {
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'NXFlow/1.0 (+https://nxflow.app)' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const articles = parseRSSXML(xml);

    return articles
      .map((a) => ({
        ...a,
        sourceName: source.name,
        keywords: matchKeywords(a.title, a.description, keywords),
      }))
      .filter((a) => a.keywords.length > 0);
  } catch {
    return [];
  }
}
